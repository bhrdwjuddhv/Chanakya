import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import * as controller from './biometric.controller.js';
import { validate, wrap } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

// Images stay in memory and go straight to the engine — nothing biometric hits disk
// except the probe, which is kept as evidence of what was searched.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpe?g|png|bmp|webp)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only JPEG, PNG, BMP or WebP images are accepted')),
});

const reviewSchema = z.object({
  matchId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  status: z.enum(['confirmed', 'rejected', 'uncertain']),
  note: z.string().max(500).optional(),
});

export const biometricRoutes = Router();
biometricRoutes.use(requireAuth);

biometricRoutes.get('/face/status', wrap(controller.status));
biometricRoutes.get('/face/search/:searchId', wrap(controller.searchResults));
biometricRoutes.get('/case/:caseId/matches', wrap(controller.caseMatches));

biometricRoutes.post(
  '/face/enroll',
  requireRole('admin', 'supervisor', 'forensic'),
  upload.array('images', 5),
  wrap(controller.enroll),
);
biometricRoutes.post('/face/search', upload.single('image'), wrap(controller.search));

// Confirming a match writes a verified edge into the graph — not everyone may do that.
biometricRoutes.post(
  '/face/review',
  requireRole('admin', 'supervisor', 'forensic'),
  validate(reviewSchema),
  wrap(controller.review),
);

biometricRoutes.get('/fingerprint/status', wrap(controller.fingerprintStatus));
biometricRoutes.post(
  '/fingerprint/enroll',
  requireRole('admin', 'supervisor', 'forensic'),
  upload.single('image'),
  wrap(controller.fingerprintEnroll),
);
biometricRoutes.post('/fingerprint/search', upload.single('image'), wrap(controller.fingerprintSearch));
biometricRoutes.post(
  '/fingerprint/review',
  requireRole('admin', 'supervisor', 'forensic'),
  validate(reviewSchema),
  wrap(controller.fingerprintReview),
);
