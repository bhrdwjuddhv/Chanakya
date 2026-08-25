const TOKEN_KEY = 'chanakya.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** One fetch wrapper. Throws ApiError with the server's message so the UI can show it. */
export async function api(path, { method = 'GET', body, formData, signal } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: formData || (body ? JSON.stringify(body) : undefined),
  });

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    setToken(null);
    window.location.href = '/login';
    throw new ApiError(401, 'Session expired');
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, payload.error || res.statusText, payload.details);
  return payload;
}

/**
 * POSTs and reads a server-sent event stream, calling onEvent for each parsed object.
 * EventSource can't send an Authorization header, so this is fetch + a small SSE parser.
 */
export async function streamSSE(path, body, onEvent, signal) {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(res.status, payload.error || res.statusText, payload.details);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Events are separated by a blank line; keep the trailing partial in the buffer.
    const parts = buffer.split('\n\n');
    buffer = parts.pop();
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data: '));
      if (line) onEvent(JSON.parse(line.slice(6)));
    }
  }
}

export const get = (path, opts) => api(path, opts);
export const post = (path, body) => api(path, { method: 'POST', body });
export const patch = (path, body) => api(path, { method: 'PATCH', body });
export const del = (path) => api(path, { method: 'DELETE' });
export const postForm = (path, formData) => api(path, { method: 'POST', formData });
