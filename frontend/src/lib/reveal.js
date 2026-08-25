const ARMED_KEY = 'chanakya.revealArmed';
const SEEN_KEY = 'chanakya.revealSeen';

/** Marks the intro as due. Called on a successful sign-in, nowhere else. */
export function armReveal() {
  try {
    sessionStorage.removeItem(SEEN_KEY);
    sessionStorage.setItem(ARMED_KEY, '1');
  } catch {
    /* private mode — the intro simply won't play */
  }
}

/**
 * Consumes the armed flag. Returns true at most once per sign-in, and never when the
 * viewer has asked for reduced motion.
 */
export function claimReveal() {
  try {
    if (sessionStorage.getItem(ARMED_KEY) !== '1') return false;
    sessionStorage.removeItem(ARMED_KEY);
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    return false;
  }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
