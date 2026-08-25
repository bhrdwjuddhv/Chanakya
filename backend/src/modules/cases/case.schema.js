import { z } from 'zod';
import { CASE_CLASSIFICATION, CASE_PRIORITY, CASE_STATUS } from './case.model.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const createCaseSchema = z.object({
  caseNumber: z.string().min(3).max(40).optional(),
  title: z.string().min(3).max(160),
  description: z.string().max(4000).optional(),
  status: z.enum(CASE_STATUS).default('open'),
  priority: z.enum(CASE_PRIORITY).default('medium'),
  classification: z.enum(CASE_CLASSIFICATION).default('restricted'),
  assignedUsers: z.array(objectId).default([]),
});

export const updateCaseSchema = createCaseSchema.partial();

export const listCaseQuerySchema = z.object({
  status: z.enum(CASE_STATUS).optional(),
  priority: z.enum(CASE_PRIORITY).optional(),
  q: z.string().max(120).optional(),
});
