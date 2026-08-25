import { z } from 'zod';
import { ENTITY_TYPES, RELATIONSHIP_STATUS, RELATIONSHIP_TYPES } from './graph.constants.js';

const csv = (values) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter((v) => values.includes(v)) : []));

export const graphQuerySchema = z.object({
  types: csv(ENTITY_TYPES),
  statuses: csv(RELATIONSHIP_STATUS),
  minConfidence: z.coerce.number().min(0).max(1).default(0),
});

export const pathQuerySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  maxHops: z.coerce.number().int().min(1).max(8).default(6),
});

export const reviewRelationshipSchema = z.object({
  relationshipId: z.string().min(1),
  status: z.enum(RELATIONSHIP_STATUS),
});

export const createRelationshipSchema = z.object({
  caseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  from: z.object({ name: z.string().min(1), type: z.enum(ENTITY_TYPES) }),
  to: z.object({ name: z.string().min(1), type: z.enum(ENTITY_TYPES) }),
  type: z.enum(RELATIONSHIP_TYPES),
  confidence: z.number().min(0).max(1).default(1),
  note: z.string().max(500).optional(),
});
