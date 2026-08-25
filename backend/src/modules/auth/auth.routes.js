import { Router } from 'express';
import * as controller from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import { validate, wrap } from '../../middleware/error.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema), wrap(controller.register));
authRoutes.post('/login', validate(loginSchema), wrap(controller.login));
authRoutes.get('/me', requireAuth, wrap(controller.me));
authRoutes.get('/users', requireAuth, requireRole('admin', 'supervisor'), wrap(controller.listUsers));
