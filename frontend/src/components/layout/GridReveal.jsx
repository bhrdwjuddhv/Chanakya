import { useEffect, useState } from 'react';
import { claimReveal } from '../../lib/reveal';

const COLS = 10;
const ROWS = 10;

/**
 * The 10x10 red-tile vanish, on the login → dashboard transition only.
 * Dramatic once, irritating on repeat, so it is gated on a session flag and on
 * prefers-reduced-motion (where it never renders at all).
 */
export function GridReveal() {
  // Decided during the initial render — a setState in an effect would cost a second pass.
  const [playing, setPlaying] = useState(claimReveal);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setPlaying(false), 1100);
    return () => clearTimeout(timer);
  }, [playing]);

  if (!playing) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] grid pointer-events-none"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
    >
      {Array.from({ length: COLS * ROWS }, (_, i) => (
        <span
          key={i}
          className="reveal-tile bg-primary"
          // Diagonal sweep: tiles nearer the top-left clear first.
          style={{ animationDelay: `${((i % COLS) + Math.floor(i / COLS)) * 28}ms` }}
        />
      ))}
    </div>
  );
}
