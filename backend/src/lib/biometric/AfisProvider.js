import { config } from '../../config/index.js';

/**
 * Client for the SourceAFIS sidecar (afis-service/).
 *
 * Two operations, matching the AFIS pattern: an image becomes an opaque template, and a
 * probe template is scored against a gallery of templates. Templates never leave the
 * server unencrypted and are never logged.
 *
 * On scores: SourceAFIS returns a log-scale similarity, not a probability. Its documented
 * guidance is that ~40 corresponds to a 1-in-10^4 false match rate. We surface the raw
 * score and rank; the verdict is the reviewer's.
 */

export const AFIS_THRESHOLD = Number(process.env.AFIS_THRESHOLD || 40);

export class AfisUnavailableError extends Error {
  constructor(detail) {
    super(`AFIS service is not reachable — fingerprint matching is unavailable. ${detail || ''}`.trim());
    this.code = 'AFIS_UNAVAILABLE';
    this.status = 503;
  }
}

async function request(path, body, timeoutMs = 30000) {
  let res;
  try {
    res = await fetch(`${config.afisUrl.replace(/\/$/, '')}${path}`, {
      method: body ? 'POST' : 'GET',
      signal: AbortSignal.timeout(timeoutMs),
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new AfisUnavailableError(err.message);
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.error) {
    const error = new Error(payload.error || res.statusText);
    // 400 from the sidecar means "this image is unusable" — a user-facing fact, not a bug.
    error.status = res.status === 400 ? 422 : 502;
    throw error;
  }
  return payload;
}

export async function health() {
  try {
    await request('/health', null, 4000);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** image -> { template (base64), minutiae }. Throws 422 if the image has no ridge detail. */
export const extract = (buffer, dpi = 500) =>
  request('/extract', { imageBase64: buffer.toString('base64'), dpi });

/** probe template vs gallery -> ranked [{ id, score, rank }]. */
export const match = (probeTemplate, gallery) =>
  request('/match', { probe: probeTemplate, gallery }, 60000);
