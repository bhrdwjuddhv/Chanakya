import { Router } from 'express';
import * as controller from './graph.controller.js';
import { createRelationshipSchema, graphQuerySchema, pathQuerySchema, reviewRelationshipSchema } from './graph.schema.js';
import { validate, wrap } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const graphRoutes = Router();
graphRoutes.use(requireAuth);

graphRoutes.get('/search', wrap(controller.search));
graphRoutes.get('/path', validate(pathQuerySchema, 'query'), wrap(controller.path));
graphRoutes.get('/node/:key', wrap(controller.node));
graphRoutes.get('/node/:key/expand', wrap(controller.expand));
graphRoutes.get('/case/:caseId', validate(graphQuerySchema, 'query'), wrap(controller.caseGraph));
graphRoutes.get('/case/:caseId/influencers', wrap(controller.influencers));

graphRoutes.post('/relationships', validate(createRelationshipSchema), wrap(controller.createRelationship));
graphRoutes.patch('/relationships/review', validate(reviewRelationshipSchema), wrap(controller.review));
graphRoutes.delete(
  '/relationships/:relationshipId',
  requireRole('admin', 'supervisor', 'investigator'),
  wrap(controller.removeRelationship),
);
