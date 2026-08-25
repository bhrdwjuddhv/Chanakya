import { Router } from 'express';
import { z } from 'zod';
import * as controller from './timeline.controller.js';
import { validate, wrap } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';

const createEventSchema = z.object({
  occurredAt: z.coerce.date(),
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  type: z.string().max(40).default('event'),
  source: z.string().max(160).optional(),
  personIds: z.array(z.string()).default([]),
  locationId: z.string().optional(),
});

export const timelineRoutes = Router();
timelineRoutes.use(requireAuth);

timelineRoutes.get('/case/:caseId', wrap(controller.list));
timelineRoutes.post('/case/:caseId', validate(createEventSchema), wrap(controller.create));
timelineRoutes.delete('/:id', wrap(controller.remove));
