import { Router } from 'express';
import { z } from 'zod';
import * as controller from './report.controller.js';
import { REPORT_TYPES } from './report.service.js';
import { validate, wrap } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const generateSchema = z.object({ type: z.enum(REPORT_TYPES) });
const reviewSchema = z.object({
  status: z.enum(['draft', 'reviewed', 'final']),
  note: z.string().max(1000).optional(),
});

export const reportRoutes = Router();
reportRoutes.use(requireAuth);

reportRoutes.get('/case/:caseId', wrap(controller.list));
reportRoutes.get('/:id', wrap(controller.get));
reportRoutes.get('/:id/export.md', wrap(controller.exportMarkdown));
reportRoutes.post('/case/:caseId/generate', validate(generateSchema), wrap(controller.generate));
// Signing a report off is a supervisory act.
reportRoutes.patch(
  '/:id/review',
  requireRole('admin', 'supervisor'),
  validate(reviewSchema),
  wrap(controller.review),
);
