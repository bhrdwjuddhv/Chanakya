import { Router } from 'express';
import * as controller from './case.controller.js';
import { createCaseSchema, listCaseQuerySchema, updateCaseSchema } from './case.schema.js';
import { validate, wrap } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const caseRoutes = Router();
caseRoutes.use(requireAuth);

caseRoutes.get('/stats/dashboard', wrap(controller.stats));
caseRoutes.get('/', validate(listCaseQuerySchema, 'query'), wrap(controller.list));
caseRoutes.get('/:id', wrap(controller.get));
caseRoutes.get('/:id/audit', wrap(controller.auditTrail));
caseRoutes.post('/', validate(createCaseSchema), wrap(controller.create));
caseRoutes.patch('/:id', validate(updateCaseSchema), wrap(controller.update));
caseRoutes.delete('/:id', requireRole('admin', 'supervisor'), wrap(controller.remove));
