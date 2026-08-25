import { Router } from 'express';
import { z } from 'zod';
import * as controller from './rag.controller.js';
import { validate, wrap } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';

const askSchema = z.object({
  question: z.string().min(3).max(1000),
  conversationId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

export const ragRoutes = Router();
ragRoutes.use(requireAuth);

ragRoutes.post('/case/:caseId/ask', validate(askSchema), wrap(controller.ask));
ragRoutes.get('/case/:caseId/suggestions', wrap(controller.suggestions));
ragRoutes.get('/case/:caseId/conversations', wrap(controller.conversations));
ragRoutes.get('/conversations/:conversationId/messages', wrap(controller.messages));
