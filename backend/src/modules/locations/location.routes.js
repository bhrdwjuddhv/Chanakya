import { Router } from 'express';
import { z } from 'zod';
import * as controller from './location.controller.js';
import { validate, wrap } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';

const createLocationSchema = z.object({
  name: z.string().min(2).max(160),
  address: z.string().max(300).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.string().max(40).default('site'),
  description: z.string().max(2000).optional(),
});

export const locationRoutes = Router();
locationRoutes.use(requireAuth);

locationRoutes.get('/case/:caseId', wrap(controller.list));
locationRoutes.post('/case/:caseId', validate(createLocationSchema), wrap(controller.create));
