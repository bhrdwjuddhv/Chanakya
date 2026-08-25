import { Router } from 'express';
import * as controller from './patterns.controller.js';
import { wrap } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';

export const patternRoutes = Router();
patternRoutes.use(requireAuth);

patternRoutes.get('/case/:caseId', wrap(controller.list));
