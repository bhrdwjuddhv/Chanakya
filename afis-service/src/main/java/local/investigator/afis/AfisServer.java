package local.investigator.afis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.machinezoo.sourceafis.FingerprintImage;
import com.machinezoo.sourceafis.FingerprintImageOptions;
import com.machinezoo.sourceafis.FingerprintMatcher;
import com.machinezoo.sourceafis.FingerprintTemplate;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Executors;

/**
 * A minimal REST wrapper around SourceAFIS. Three endpoints, JSON in, JSON out:
 *
 *   GET  /health                     liveness
 *   POST /extract  {imageBase64,dpi} -> {template, minutiae, quality}
 *   POST /match    {probe, gallery[]} -> ranked [{id, score}]
 *
 * Templates are opaque SourceAFIS CBOR blobs, returned base64. The caller stores them
 * encrypted; this service is stateless and keeps nothing.
 *
 * On scores: SourceAFIS returns a log-scale similarity, not a probability. Its own
 * documented guidance is that ~40 corresponds to a 1-in-10^4 false match rate. We report
 * the raw score and let the caller decide — no verdict is made here.
 */
public final class AfisServer {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_BODY_BYTES = 12 * 1024 * 1024;

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("AFIS_PORT", "8090"));

        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.createContext("/health", exchange -> {
            ObjectNode body = JSON.createObjectNode();
            body.put("ok", true);
            body.put("engine", "sourceafis");
            respond(exchange, 200, body);
        });
        server.createContext("/extract", handler(AfisServer::extract));
        server.createContext("/match", handler(AfisServer::match));

        // SourceAFIS extraction is CPU-bound; a small pool keeps one slow image from
        // blocking every other request.
        server.setExecutor(Executors.newFixedThreadPool(
                Math.max(2, Runtime.getRuntime().availableProcessors())));
        server.start();
        System.out.println("afis-service listening on " + port);
    }

    interface Endpoint {
        JsonNode handle(JsonNode request) throws Exception;
    }

    private static com.sun.net.httpserver.HttpHandler handler(Endpoint endpoint) {
        return exchange -> {
            if (!"POST".equals(exchange.getRequestMethod())) {
                respond(exchange, 405, error("Use POST"));
                return;
            }
            try {
                byte[] raw = readBody(exchange.getRequestBody());
                JsonNode request = JSON.readTree(raw);
                respond(exchange, 200, endpoint.handle(request));
            } catch (IllegalArgumentException e) {
                respond(exchange, 400, error(e.getMessage()));
            } catch (Exception e) {
                respond(exchange, 500, error(e.getClass().getSimpleName() + ": " + e.getMessage()));
            }
        };
    }

    /** image -> template. Rejects an image with no usable ridge detail rather than returning an empty template. */
    private static JsonNode extract(JsonNode request) {
        byte[] image = decodeImage(request);
        int dpi = request.path("dpi").asInt(500);

        FingerprintImage fingerprint = new FingerprintImage(
                image, new FingerprintImageOptions().dpi(dpi));
        FingerprintTemplate template = new FingerprintTemplate(fingerprint);

        // SourceAFIS does not expose a quality score; minutia count is the honest proxy
        // and is what tells a caller "this scan is too poor to enrol".
        int minutiae = countMinutiae(template);
        if (minutiae < 8) {
            throw new IllegalArgumentException(
                    "Only " + minutiae + " minutiae found — the image does not appear to contain usable "
                            + "fingerprint ridge detail. Check the scan, or the dpi value (" + dpi + ").");
        }

        ObjectNode response = JSON.createObjectNode();
        response.put("template", Base64.getEncoder().encodeToString(template.toByteArray()));
        response.put("minutiae", minutiae);
        response.put("dpi", dpi);
        return response;
    }

    /** 1:N. Scores every gallery template against the probe and returns them ranked. */
    private static JsonNode match(JsonNode request) {
        JsonNode probeNode = request.get("probe");
        if (probeNode == null || probeNode.isNull()) {
            throw new IllegalArgumentException("probe template is required");
        }
        FingerprintTemplate probe = template(probeNode.asText());
        FingerprintMatcher matcher = new FingerprintMatcher(probe);

        JsonNode gallery = request.get("gallery");
        if (gallery == null || !gallery.isArray()) {
            throw new IllegalArgumentException("gallery must be an array of {id, template}");
        }

        List<ObjectNode> scored = new ArrayList<>();
        for (JsonNode entry : gallery) {
            ObjectNode row = JSON.createObjectNode();
            row.put("id", entry.path("id").asText());
            try {
                row.put("score", matcher.match(template(entry.path("template").asText())));
            } catch (Exception e) {
                // One unreadable gallery template must not fail the whole search.
                row.put("score", 0.0);
                row.put("error", e.getMessage());
            }
            scored.add(row);
        }
        scored.sort(Comparator.comparingDouble((ObjectNode r) -> r.path("score").asDouble()).reversed());

        ArrayNode matches = JSON.createArrayNode();
        for (int i = 0; i < scored.size(); i++) {
            matches.add(scored.get(i).put("rank", i + 1));
        }

        ObjectNode response = JSON.createObjectNode();
        response.set("matches", matches);
        response.put("engine", "sourceafis");
        return response;
    }

    private static FingerprintTemplate template(String base64) {
        if (base64 == null || base64.isEmpty()) throw new IllegalArgumentException("empty template");
        return new FingerprintTemplate(Base64.getDecoder().decode(base64));
    }

    private static byte[] decodeImage(JsonNode request) {
        JsonNode node = request.get("imageBase64");
        if (node == null || node.asText().isEmpty()) {
            throw new IllegalArgumentException("imageBase64 is required");
        }
        // Tolerate a data: URI prefix so callers can pass what a browser hands them.
        String value = node.asText().replaceFirst("^data:[^;]+;base64,", "");
        return Base64.getDecoder().decode(value);
    }

    private static int countMinutiae(FingerprintTemplate template) {
        // The serialised template is CBOR; its minutiae array length is the count we want.
        // Parsing the public JSON form avoids depending on SourceAFIS internals.
        try {
            JsonNode parsed = new com.fasterxml.jackson.dataformat.cbor.CBORFactory()
                    .setCodec(JSON)
                    .createParser(template.toByteArray())
                    .readValueAsTree();
            JsonNode positions = parsed.path("positionsX");
            if (positions.isArray()) return positions.size();
            JsonNode minutiae = parsed.path("minutiae");
            return minutiae.isArray() ? minutiae.size() : -1;
        } catch (Exception e) {
            return -1; // unknown rather than wrong
        }
    }

    private static byte[] readBody(InputStream stream) throws IOException {
        byte[] body = stream.readNBytes(MAX_BODY_BYTES);
        if (body.length == MAX_BODY_BYTES) throw new IllegalArgumentException("Request body too large");
        return body;
    }

    private static ObjectNode error(String message) {
        ObjectNode node = JSON.createObjectNode();
        node.put("error", message == null ? "Unknown error" : message);
        return node;
    }

    private static void respond(HttpExchange exchange, int status, JsonNode body) throws IOException {
        byte[] bytes = JSON.writeValueAsBytes(body);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    private AfisServer() {}
}
