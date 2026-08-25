import { Router } from 'express';
import multer from 'multer';
import * as controller from './forensic.controller.js';
import { wrap } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

// Any file type is fair game for forensics — that is the point.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 32 * 1024 * 1024 } });

export const forensicRoutes = Router();
forensicRoutes.use(requireAuth);

forensicRoutes.get('/lookup', wrap(controller.lookup));
forensicRoutes.get('/case/:caseId', wrap(controller.list));
forensicRoutes.get('/:id', wrap(controller.get));
forensicRoutes.post(
  '/analyse',
  requireRole('admin', 'supervisor', 'forensic', 'investigator'),
  upload.single('file'),
  wrap(controller.analyse),
);
