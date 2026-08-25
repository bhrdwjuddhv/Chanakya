import { Router } from 'express';
import { listAudit } from './audit.service.js';
import { wrap } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';

export const auditRoutes = Router();
auditRoutes.use(requireAuth);

auditRoutes.get(
  '/',
  wrap(async (req, res) => {
    res.json({
      entries: await listAudit({ caseId: req.query.caseId, limit: Number(req.query.limit) || 100 }),
    });
  }),
);
