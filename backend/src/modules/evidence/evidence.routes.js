import { Router } from 'express';
import multer from 'multer';
import * as controller from './evidence.controller.js';
import { wrap } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const evidenceRoutes = Router();
evidenceRoutes.use(requireAuth);

evidenceRoutes.post('/', upload.single('file'), wrap(controller.upload));
evidenceRoutes.get('/case/:caseId', wrap(controller.list));
evidenceRoutes.get('/:id', wrap(controller.get));
evidenceRoutes.get('/:id/text', wrap(controller.text));
evidenceRoutes.post('/:id/reprocess', wrap(controller.reprocess));
evidenceRoutes.delete('/:id', requireRole('admin', 'supervisor', 'investigator'), wrap(controller.remove));
