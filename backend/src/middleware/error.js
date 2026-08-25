import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Wraps async route handlers so rejections reach the error handler. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Validates req[source] against a Zod schema and replaces it with the parsed value. */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const parsed = schema.safeParse(req[source]);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  req[source === 'query' ? 'validatedQuery' : source] = parsed.data;
  next();
};

export function notFound(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err.status || (err instanceof ZodError ? 400 : 500);
  if (status >= 500) logger.error(`${req.method} ${req.originalUrl} — ${err.stack || err.message}`);
  else logger.warn(`${req.method} ${req.originalUrl} — ${err.message}`);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    code: err.code,
    ...(status >= 500 && process.env.NODE_ENV !== 'production' ? { detail: err.message } : {}),
  });
}
