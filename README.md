# Chanakya

**An AI-powered criminal network analysis system.**

Analyse structured and unstructured crime data, extract entities, build relationship maps,
**identify key influencers**, detect suspicious patterns, and give investigators grounded,
visual insight.

Named for the strategist who argued that a network is understood through the people who
connect it, not the people who shout loudest in it — which is exactly what the influencer
detection here is for.

This is a prototype. All seeded cases, people, companies and documents are **fictional**.

---

## What works right now

| Area | State |
|---|---|
| Auth, RBAC (4 roles), audit trail | Done |
| Cases, dashboard, people | Done |
| Evidence upload → text extraction → chunking → embedding → entity extraction → graph | Done |
| Neo4j relationship graph + interactive Cytoscape visualisation | Done |
| Key influencer detection (GDS degree, betweenness, PageRank, Louvain) | Done |
| Suspicious pattern detection (4 structural rules) | Done |
| Timeline, map | Done |
| Grounded RAG Q&A with citations | Built — needs an API key to run |
| Face recognition (InsightFace, 1:N) + human review → graph | Done, verified |
| Fingerprint (SourceAFIS sidecar, 1:N) | Engine done, verified — gallery needs a real dataset |
| Digital forensics (hash, magic-byte typing, EXIF, indicators) | Done, verified |
| OSINT connector framework + entity resolution | Done, verified |
| Grounded reports with per-line sourcing and export | Done, verified |

The Biometrics page reports the real reachability of each engine. It never shows invented
candidates or scores.

**Verified face search** — probes are re-cropped, rescaled, re-compressed copies that were
never enrolled:

```
iris-delacroix  → rank1=Iris Delacroix   sim=0.9660  ✓
marcus-vale     → rank1=Marcus Vale      sim=0.9388  ✓
tommy-nguyen    → rank1=Tommy Nguyen     sim=0.9048  ✓
jonas-kerr      → rank1=Jonas Kerr       sim=0.9581  ✓
```

One candidate clears the 0.4 threshold in each case; the other seven identities are
correctly rejected. Confirming a candidate writes a `CONFIRMED` `MATCHED_BY` edge
attributed to the reviewer. An `investigator` gets 403 on confirm — only forensic,
supervisor and admin may.

---

## Running it

Requires Docker and Node 20+.

```bash
docker compose run --rm models    # one-time: installs the buffalo_l face model
docker compose up -d              # mongo, neo4j (GDS + APOC), qdrant, insightface

cd backend && npm install && npm run seed && npm run dev
cd frontend && npm install && npm run dev     # http://localhost:5173
```

The seed prints four dev logins when it finishes. They are also listed on the sign-in page.

`GET /api/health` reports every dependency. Mongo, Neo4j and Qdrant are the core three; the
rest degrade gracefully and the UI shows which are down.

### Ports and names

MongoDB is published on **27018**, not 27017. A locally-installed `mongod` commonly owns
27017, and the app would silently connect to that empty database instead of the container.

The compose project is `chanakya`, the database is `chanakya`, and the InsightFace gallery
collection is `chanakya-persons`. If you ran an earlier build under the old name, the old
`investigator_*` volumes and containers are still on disk — remove them with
`docker compose -p investigator down -v` once you are happy the new stack works.

### The fingerprint gallery

The SourceAFIS sidecar (`afis-service/`) is built and verified: it extracts ~100 real
minutiae per print, returns real match scores, stores templates AES-256-GCM encrypted, and
rejects an unusable image with a 422. Start it with:

```bash
docker compose --profile biometrics up -d afis
```

The gallery is **empty by default and the UI says so**. I generated synthetic ridge images
to smoke-test the pipeline (`generate-fingerprints.js`, output in
`fingerprints/smoke-test/`), and they do exercise it end to end — a well-aligned same-finger
pair scores 20-35 against a runner-up of 1-3. But across eight generated identities only
about half of probes ranked their own finger first, and one probe false-matched a different
identity at 15.7, because every print comes from the same generator and they share global
ridge topology in a way real fingers do not. They are therefore **deliberately not enrolled
by the seed** — shipping them as a demo gallery would misrepresent the engine.

For a working gallery, drop a real dataset into
`backend/src/seed/reference-galleries/fingerprints/gallery/<person-slug>/<finger>.png`
(SOCOFing on Kaggle, or NIST SD302/SD4) and re-run the seed. Nothing else needs changing.

### The face gallery

Eight GAN-generated faces (thispersondoesnotexist.com — no real person is depicted) live in
`backend/src/seed/reference-galleries/faces/`. `prepare-faces.js` splits each into an
enrolled gallery image and a re-cropped probe, and the seed enrols the gallery into
InsightFace for real. To use a different set, drop images into
`faces/gallery/<person-slug>/` and re-run the seed.

Embeddings live inside the InsightFace service. This application's database stores only the
linkage, and never logs an image, embedding or template.

### AI provider

Entity extraction, summaries and search indexing need an API key in `backend/.env`:

```
OPENAI_API_KEY=sk-...
```

Without one the app still runs end to end: documents upload and extract text, and the seeded
graph, influencer detection, patterns, timeline and map all work — they don't touch the LLM.
Evidence rows say plainly that AI is disabled rather than pretending to have processed.

---

## Forensics, OSINT and reports

**Forensics** hashes a file three ways, then identifies what it *actually* is from its magic
bytes rather than trusting the extension — a renamed executable is the classic finding and it
is flagged explicitly. Images give up EXIF including GPS; binaries get `strings` treatment so
embedded selectors surface. Extracted indicators enter the graph **unverified**, because an
address appearing in a file is a fact about the file, not about a person.

Verified against an executable renamed to `.jpg`:

```
detected       pe-executable   EXT MISMATCH: true
indicators     ipv4=203.0.113.44  email=ops@harbor-shadow.example
               url=http://drop.example/x  phone=+1-415-555-0142  domain=drop.example
entitiesAdded  4
```

**OSINT** is a connector framework. A connector declares the selector kinds it handles and
returns records in one shape; normalisation, entity resolution and graph writing are shared.
Two connectors ship: the platform's own holdings (the first question any unit asks of a new
selector), and a bundled **fictional** registry standing in for a public source. Neither
scrapes a live third-party system. Results are resolved against the case graph so genuinely
new leads are separated from what is already known:

```
Iris Delacroix · Ledger Glass Consulting  → all 4 entities: known
Iris Delacroix · Pelham Nominees Ltd      → Organization: NEW
```

Accepting a finding writes it as `INFERRED` with the source record attached — open-source
material is a lead, not a fact, and still needs human confirmation in the graph.

**Reports** are assembled from the record first and narrated second. Every line carries the
source it came from, and the sections are kept apart on purpose: established facts, evidence
relied on (with hashes), computed findings, open questions, and — separately — AI prose.
Open questions are generated from what is *missing* (unreviewed suggestions, failed
processing, unexplained extension mismatches), not guessed. A report generated without an API
key is complete; it simply has no narrative, and says so. Sign-off is supervisor-only
(`investigator` gets 403) and export is Markdown.

---

## Architecture

```
backend/src/
  modules/            one folder per feature — routes, controller, service, model
    auth/ cases/ evidence/ graph/ patterns/ persons/ timeline/ locations/ audit/ health/
    biometrics/ rag/ forensics/ osint/ reports/
  lib/                mongoose, neo4j, qdrant, storage, crypto, ai/
  middleware/         auth, rbac, zod validation, error handling
  seed/               seed.js + fictional case data + upload-ready documents
frontend/src/
  pages/ components/{case,graph,layout,ui}/ lib/
```

Three stores, each doing what it is good at:

- **MongoDB** — cases, evidence, people, timeline, locations, audit log
- **Neo4j** — the relationship graph and every centrality/community algorithm
- **Qdrant** — document chunk embeddings, always filtered by `caseId`

### Rules the code actually enforces

1. **Nothing the machine writes is confirmed.** Every AI-extracted relationship enters the
   graph as `AI_SUGGESTED` or `INFERRED`. Only a human review promotes it to `CONFIRMED`,
   and the graph shows the difference in both colour and line style.
2. **Every relationship carries its provenance** — confidence, source evidence, extraction
   method, and a verbatim snippet where one exists.
3. **RAG is case-scoped.** Every vector query filters on `caseId`.
4. **Findings state observations, not conclusions.** A shared intermediary is the shape of a
   pass-through arrangement and equally the shape of an ordinary shared supplier.
5. **Sensitive actions are audited**, append-only.

---

## The seeded cases

Three fictional cases in an Indian law enforcement and intelligence context (NCRB / MHA / State Police):

- **Operation Sagar Chhaya** — JNPT bonded container cargo theft ring. Vikramaditya Singhania ("Bada Seth") never touches the cargo but every transport route passes through him; his betweenness centrality is the highest in the case.
- **Yamuna Expressway Abduction & Tech Theft** — missing DRDO-aligned composite scientist Dr. Ananya Sen. Shares Vikramaditya Singhania and Singhania Multi-Modal Logistics with Sagar Chhaya, so the cross-case bridge rule fires on real data.
- **Operation Kaagazi Company** — municipal procurement fraud (DMDA). Unrelated contractors all pay kickbacks into Kanch Consultancy Services LLP. Isha Deshmukh, its sole designated partner, is not a named suspect in initial complaints but is the only path between the government procurement cluster and the private contractor cluster.

Verified output from the seeded graph:

```
Harish Chandra Mehra → Isha Deshmukh → Varun Lodha          (2 hops)
Gita Trivedi → Neeta Bakshi → Isha Deshmukh → Sanjay Oswal   (3 hops)
```

`backend/src/seed/mock-data/documents/for-live-upload/` holds documents that are **not**
seeded — upload one during a demo to watch new entities enter the graph.

---

## Pattern rules

| Rule | Fires when |
|---|---|
| `cross_case_bridge` | An entity appears in more than one case |
| `shared_intermediary` | ≥3 entities route through one hub and ≥80% of their pairs have no direct link |
| `unnamed_broker` | A high-betweenness person is not recorded as a suspect or victim |
| `community_bridge` | A single relationship is the only link between two Louvain clusters |

The intermediary rule uses a *ratio* rather than a raw count — in a sparse graph any hub
accumulates disconnected pairs, so the count alone flags everything.

## The case assistant

Retrieve (case-scoped vector search) → lexical rerank → answer, streamed over SSE. The model
is given numbered sources and must open with a `SUFFICIENCY:` verdict; where the evidence
does not answer the question it says so instead of answering anyway.

Citations are resolved from the `[n]` markers the model actually wrote against the chunks
that were actually retrieved. An out-of-range marker is dropped, so a citation cannot point
at a source that does not exist.
