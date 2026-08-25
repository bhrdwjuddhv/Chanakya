import { config } from '../config/index.js';

// ponytail: plain fetch instead of @qdrant/js-client-rest — we use 4 endpoints.
const base = () => config.qdrantUrl.replace(/\/$/, '');

async function qdrant(path, options = {}) {
  const res = await fetch(`${base()}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`qdrant ${path}: ${json?.status?.error || res.statusText}`);
  return json.result;
}

export const COLLECTION = 'case_documents';

export async function qdrantHealth() {
  try {
    await qdrant('/collections');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Idempotent. size must match the embedding model (1536 for text-embedding-3-small). */
export async function ensureCollection(size = 1536) {
  const existing = await qdrant('/collections');
  if (existing.collections.some((c) => c.name === COLLECTION)) return;
  await qdrant(`/collections/${COLLECTION}`, {
    method: 'PUT',
    body: { vectors: { size, distance: 'Cosine' } },
  });
  await qdrant(`/collections/${COLLECTION}/index`, {
    method: 'PUT',
    body: { field_name: 'caseId', field_schema: 'keyword' },
  });
}

export async function upsertPoints(points) {
  if (!points.length) return;
  await qdrant(`/collections/${COLLECTION}/points?wait=true`, { method: 'PUT', body: { points } });
}

/** Always case-scoped — RAG must never leak across cases. */
export async function searchPoints({ vector, caseId, limit = 8 }) {
  return qdrant(`/collections/${COLLECTION}/points/search`, {
    method: 'POST',
    body: {
      vector,
      limit,
      with_payload: true,
      filter: { must: [{ key: 'caseId', match: { value: String(caseId) } }] },
    },
  });
}

export async function deleteByCase(caseId) {
  await qdrant(`/collections/${COLLECTION}/points/delete?wait=true`, {
    method: 'POST',
    body: { filter: { must: [{ key: 'caseId', match: { value: String(caseId) } }] } },
  });
}

export async function dropCollection() {
  await fetch(`${base()}/collections/${COLLECTION}`, { method: 'DELETE' });
}
