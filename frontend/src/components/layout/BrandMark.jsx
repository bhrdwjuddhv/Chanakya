import { cn } from '../../lib/utils';

/**
 * The Chanakya mark: five peripheral nodes wired to one central broker.
 * It is the product's thesis in a 20px square — the centre is what matters.
 */
export function BrandMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-4', className)} role="img" aria-label="Chanakya">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45">
        <path d="M16 16 L8 8" />
        <path d="M16 16 L24 8" />
        <path d="M16 16 L7 21" />
        <path d="M16 16 L25 21" />
        <path d="M16 16 L16 26" />
      </g>
      <g fill="currentColor" opacity="0.55">
        <circle cx="8" cy="8" r="2.1" />
        <circle cx="24" cy="8" r="2.1" />
        <circle cx="7" cy="21" r="2.1" />
        <circle cx="25" cy="21" r="2.1" />
        <circle cx="16" cy="26" r="2.1" />
      </g>
      <circle cx="16" cy="16" r="5.4" fill="currentColor" opacity="0.2" />
      <circle cx="16" cy="16" r="3.4" fill="currentColor" />
    </svg>
  );
}
