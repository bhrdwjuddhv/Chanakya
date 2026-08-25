import { z } from 'zod';
import { ROLES } from './user.model.js';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ROLES).default('investigator'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
