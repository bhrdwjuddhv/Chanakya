import { config } from '../../config/index.js';

/**
 * Client for the self-hosted InsightFace Server /v1 API.
 *
 * Contract notes taken from the running server's OpenAPI spec, not guessed:
 *  - the server listens on 8080 inside the container (18097 on the host)
 *  - health is /v1/health, not /health
 *  - collection creation is JSON; every image-carrying endpoint is multipart/form-data
 *  - search returns `matches` with a cosine similarity, plus the threshold it applied
 *
 * Nothing here logs an image, an embedding or the API key.
 */

export const FACE_COLLECTION = 'chanakya-persons';

export class BiometricUnavailableError extends Error {
  constructor(detail) {
    super(`InsightFace Server is not reachable — face search is unavailable. ${detail || ''}`.trim());
    this.code = 'BIOMETRIC_UNAVAILABLE';
    this.status = 503;
  }
}

const base = () => config.insightface.url.replace(/\/$/, '');

function authHeaders() {
  return config.insightface.apiKey ? { Authorization: `Bearer ${config.insightface.apiKey}` } : {};
}

async function request(path, { method = 'GET', json, form, timeoutMs = 30000 } = {}) {
  let res;
  try {
    res = await fetch(`${base()}/v1${path}`, {
      method,
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        ...authHeaders(),
        ...(json ? { 'content-type': 'application/json' } : {}),
      },
      body: json ? JSON.stringify(json) : form,
    });
  } catch (err) {
    throw new BiometricUnavailableError(err.message);
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error?.message || payload?.detail || res.statusText;
    const error = new Error(`InsightFace: ${message}`);
    error.status = res.status === 404 ? 404 : 502;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload;
}

export async function health() {
  try {
    await request('/health', { timeoutMs: 4000 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export const listModels = () => request('/models');

/** Drops the collection and everything enrolled in it. Seed-time reset only. */
export async function resetCollection(id = FACE_COLLECTION) {
  try {
    await request(`/collections/${id}?force=true`, { method: 'DELETE' });
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  return ensureCollection(id);
}

/** Idempotent. A collection pins the model and embedding contract for everything in it. */
export async function ensureCollection(id = FACE_COLLECTION) {
  try {
    return await request(`/collections/${id}`);
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  return request('/collections', {
    method: 'POST',
    json: {
      id,
      name: 'Chanakya person gallery',
      description: 'Reference faces enrolled from case records.',
    },
  });
}

/** Detection only — used to tell a user "no face found" before anything is enrolled. */
export async function detect(buffer, filename) {
  const form = new FormData();
  form.append('image', new Blob([buffer]), filename || 'probe.jpg');
  return request('/detect', { method: 'POST', form });
}

/** Creates the person and its first face samples in one call. Multiple images is better. */
export async function enrollPerson({ collectionId = FACE_COLLECTION, name, externalId, images }) {
  const form = new FormData();
  for (const image of images) {
    form.append('images', new Blob([image.buffer]), image.filename);
  }
  if (name) form.append('name', name);
  if (externalId) form.append('external_id', externalId);

  return request(`/collections/${collectionId}/persons`, { method: 'POST', form });
}

export async function addFaceSamples({ collectionId = FACE_COLLECTION, personId, images }) {
  const form = new FormData();
  for (const image of images) form.append('images', new Blob([image.buffer]), image.filename);
  return request(`/collections/${collectionId}/persons/${personId}/faces`, { method: 'POST', form });
}

/**
 * 1:N search. Returns the engine's own ranked matches and the threshold it applied.
 * The score is a raw cosine similarity — not a probability, and not an identification.
 */
export async function search({ collectionId = FACE_COLLECTION, buffer, filename, limit = 10, threshold }) {
  const form = new FormData();
  form.append('image', new Blob([buffer]), filename || 'probe.jpg');
  form.append('limit', String(limit));
  if (threshold != null) form.append('threshold', String(threshold));

  return request(`/collections/${collectionId}/search`, { method: 'POST', form, timeoutMs: 60000 });
}

export const listPersons = (collectionId = FACE_COLLECTION) =>
  request(`/collections/${collectionId}/persons`);

export const deletePerson = (personId, collectionId = FACE_COLLECTION) =>
  request(`/collections/${collectionId}/persons/${personId}`, { method: 'DELETE' });
