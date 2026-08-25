import { create } from 'zustand';
import { get, post, setToken, getToken } from './api';

export const useAuth = create((set) => ({
  user: null,
  loading: true,

  async bootstrap() {
    if (!getToken()) return set({ loading: false });
    try {
      const { user } = await get('/auth/me');
      set({ user, loading: false });
    } catch {
      setToken(null);
      set({ user: null, loading: false });
    }
  },

  async login(email, password) {
    const { token, user } = await post('/auth/login', { email, password });
    setToken(token);
    set({ user });
    return user;
  },

  logout() {
    setToken(null);
    set({ user: null });
  },
}));

/** Mirrors the server's RBAC so the UI can hide what the API would refuse anyway. */
export const can = (user, action) => {
  if (!user) return false;
  const rules = {
    deleteCase: ['admin', 'supervisor'],
    deleteEvidence: ['admin', 'supervisor', 'investigator'],
    manageUsers: ['admin'],
    confirmRelationship: ['admin', 'supervisor', 'investigator'],
    reviewBiometrics: ['admin', 'supervisor', 'forensic'],
  };
  return (rules[action] || []).includes(user.role);
};
