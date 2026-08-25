import { Router } from 'express';
import { z } from 'zod';
import * as controller from './person.controller.js';
import { validate, wrap } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';

const personSchema = z.object({
  name: z.string().min(2).max(120),
  aliases: z.array(z.string().max(80)).default([]),
  role: z.string().max(40).optional(),
  dateOfBirth: z.string().max(40).optional(),
  nationality: z.string().max(60).optional(),
  notes: z.string().max(2000).optional(),
  caseIds: z.array(z.string()).default([]),
});

export const personRoutes = Router();
personRoutes.use(requireAuth);

personRoutes.get('/', wrap(controller.list));
personRoutes.get('/:id', wrap(controller.get));
personRoutes.post('/', validate(personSchema), wrap(controller.create));
personRoutes.patch('/:id', validate(personSchema.partial()), wrap(controller.update));
