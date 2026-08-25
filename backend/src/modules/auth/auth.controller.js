import * as authService from './auth.service.js';
import * as audit from '../audit/audit.service.js';
import { User } from './user.model.js';

export async function register(req, res) {
  const result = await authService.register(req.body);
  await audit.record({ user: result.user }, 'REGISTER', { resourceType: 'user', resourceId: result.user._id });
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.login(req.body);
  await audit.record({ user: { ...result.user, id: result.user._id } }, 'LOGIN', {
    resourceType: 'user',
    resourceId: result.user._id,
  });
  res.json(result);
}

export async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: user.toJSON() });
}

export async function listUsers(req, res) {
  const users = await authService.listUsers();
  res.json({ users: users.map(({ passwordHash, ...u }) => u) });
}
