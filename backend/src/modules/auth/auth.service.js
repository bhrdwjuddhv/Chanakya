import bcrypt from 'bcryptjs';
import { User } from './user.model.js';
import { signToken } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/error.js';

export async function register({ name, email, password, role }) {
  if (await User.exists({ email })) throw new HttpError(409, 'Email already registered');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role });
  return { token: signToken(user), user: user.toJSON() };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Same message either way — don't confirm which emails exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  return { token: signToken(user), user: user.toJSON() };
}

export const listUsers = () => User.find().sort({ name: 1 }).lean();
