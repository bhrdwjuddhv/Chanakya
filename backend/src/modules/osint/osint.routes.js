import { Router } from 'express';
import { z } from 'zod';
import * as controller from './osint.controller.js';
import { validate, wrap } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const searchSchema = z.object({
  query: z.string().min(2).max(200),
  kind: z.enum(['name', 'email', 'phone', 'username', 'company']).optional(),
  sources: z.array(z.string()).optional(),
  caseId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

const acceptSchema = z.object({
  caseId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

export const osintRoutes = Router();
osintRoutes.use(requireAuth);

osintRoutes.get('/connectors', wrap(controller.connectors));
osintRoutes.get('/case/:caseId', wrap(controller.list));
osintRoutes.post('/search', validate(searchSchema), wrap(controller.search));
// Accepting writes to the case graph, so it needs more than read access.
osintRoutes.post(
  '/findings/:id/accept',
  requireRole('admin', 'supervisor', 'investigator'),
  validate(acceptSchema),
  wrap(controller.accept),
);
osintRoutes.post('/findings/:id/dismiss', wrap(controller.dismiss));
