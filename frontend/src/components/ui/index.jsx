import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ponytail: the primitives this app actually uses, written out. No component
// generator, no radix tree — add one when a real popover/focus-trap is needed.

const BUTTON_VARIANTS = {
  // The one primary action per view. Red glow in dark, soft shadow in light.
  primary:
    'bg-primary text-primary-foreground shadow-glow hover:brightness-110 active:brightness-95 disabled:shadow-none',
  // Hero moments only (login, empty-state CTA): dark gradient + accent border + glow.
  signature:
    'text-foreground border border-primary/60 shadow-glow hover:border-primary ' +
    'bg-gradient-to-b from-[#151515] to-[#1D1D1D] text-[#DBDBDB] ' +
    'dark:from-[#151515] dark:to-[#1D1D1D]',
  secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-muted',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'bg-destructive text-destructive-foreground hover:brightness-110',
  subtle: 'bg-muted text-foreground hover:bg-surface-2',
};

const BUTTON_SIZES = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
  icon: 'size-9 p-0',
};

export function Button({ variant = 'primary', size = 'md', className, loading, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-control font-medium',
        'transition-[background-color,border-color,color,filter,transform] duration-150 ease-standard',
        'hover:scale-[1.02] active:scale-100',
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}

/**
 * Rolling-text hover — the label slides up and its clone rises into place.
 * Reserved for hero CTAs; `prefers-reduced-motion` collapses it to a static label.
 */
export function RollingButton({ children, className, loading, ...props }) {
  return (
    <Button variant="signature" className={cn('group overflow-hidden', className)} loading={loading} {...props}>
      {loading ? (
        children
      ) : (
        <span className="relative block h-[1.2em] overflow-hidden">
          <span className="block transition-transform duration-300 ease-signature group-hover:-translate-y-full motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
            {children}
          </span>
          <span
            aria-hidden
            className="absolute inset-0 block translate-y-full transition-transform duration-300 ease-signature group-hover:translate-y-0 motion-reduce:hidden"
          >
            {children}
          </span>
        </span>
      )}
    </Button>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('bg-card text-card-foreground border border-border rounded-card shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 py-3.5 border-b border-border', className)}>
      <div className="min-w-0">
        <h3 className="label">{title}</h3>
        {description && <p className="text-[13px] text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Badge({ className, children, dot, dotClass, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5',
        'text-[11px] font-medium whitespace-nowrap',
        'bg-muted text-muted-foreground border-border',
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('size-1.5 rounded-full shrink-0', dotClass)} style={{ background: dot }} />}
      {children}
    </span>
  );
}

/** Status pill with an optional pulsing dot — used for live/processing state. */
export function StatusPill({ tone = 'muted', pulse, children, className }) {
  const tones = {
    live: 'bg-success/12 text-success border-success/25',
    muted: 'bg-muted text-muted-foreground border-border',
    primary: 'bg-primary/12 text-primary border-primary/30',
    warning: 'bg-warning/12 text-warning border-warning/25',
  };
  const dots = { live: 'bg-success', muted: 'bg-muted-foreground', primary: 'bg-primary', warning: 'bg-warning' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 text-[11px] font-medium',
        tones[tone],
        className,
      )}
      style={tone === 'live' ? { boxShadow: 'var(--shadow-status-live)' } : undefined}
    >
      <span className={cn('size-1.5 rounded-full', dots[tone], pulse && 'pulse-dot')} />
      {children}
    </span>
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-control border border-input bg-card px-3 text-sm text-foreground',
        'placeholder:text-muted-foreground transition-colors duration-150 ease-standard',
        'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25',
        'disabled:bg-muted disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-control border border-input bg-card px-3 py-2 text-sm text-foreground',
        'placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'h-9 rounded-control border border-input bg-card px-2.5 text-sm text-foreground',
        'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Spinner({ label = 'Loading', className }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground', className)}>
      <Loader2 className="size-4 animate-spin text-primary" />
      {label}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-control bg-muted', className)} />;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-14 px-6 text-center', className)}>
      <Icon className="size-7 text-muted-foreground/50" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="text-[13px] text-muted-foreground max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Always show what actually went wrong — a generic "something went wrong" helps nobody. */
export function ErrorState({ error, onRetry, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 px-6 text-center', className)}>
      <AlertTriangle className="size-6 text-warning" />
      <p className="text-sm font-semibold text-foreground">Could not load this</p>
      <p className="text-[13px] text-muted-foreground max-w-md">{error?.message || 'Unknown error'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-border overflow-x-auto', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative px-3 py-2.5 text-[13px] font-medium whitespace-nowrap -mb-px border-b-2',
            'transition-colors duration-150 ease-standard',
            value === tab.value
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            {tab.icon && <tab.icon className={cn('size-3.5', value === tab.value && 'text-primary')} />}
            {tab.label}
            {tab.count != null && (
              <span className="font-mono text-[10px] font-normal text-muted-foreground tabular-nums">{tab.count}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Dashboard/overview metric. Delta is optional and colour-coded by direction. */
export function Stat({ icon: Icon, label, value, hint, delta, spin, onClick, className }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-card shadow-card p-5 text-left w-full',
        onClick && 'transition-colors duration-150 ease-standard hover:border-primary/40',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn('size-3.5 text-muted-foreground', spin && 'animate-spin text-warning')} />}
        <span className="label">{label}</span>
      </div>
      <p className="mt-2.5 font-mono text-2xl font-medium tabular-nums text-foreground">{value ?? '—'}</p>
      {(hint || delta) && (
        <p className="mt-1 text-[12px] text-muted-foreground">
          {delta && (
            <span className={cn('mr-1.5 font-mono', delta.startsWith('-') ? 'text-destructive' : 'text-success')}>
              {delta.startsWith('-') ? '↓' : '↑'} {delta.replace('-', '')}
            </span>
          )}
          {hint}
        </p>
      )}
    </Wrapper>
  );
}

/* Dense table primitives — uppercase micro headers, mono data, right-aligned numbers. */

export const Table = ({ className, children }) => (
  <div className="overflow-x-auto">
    <table className={cn('w-full text-sm', className)}>{children}</table>
  </div>
);

export const Th = ({ className, children, numeric }) => (
  <th className={cn('label px-5 py-2.5 text-left font-medium', numeric && 'text-right', className)}>{children}</th>
);

export const Td = ({ className, children, mono, numeric }) => (
  <td
    className={cn(
      'px-5 py-2.5 align-middle',
      mono && 'font-mono text-[13px] font-normal',
      numeric && 'text-right tabular-nums',
      className,
    )}
  >
    {children}
  </td>
);

export const Tr = ({ className, children, ...props }) => (
  <tr
    className={cn('border-b border-border/60 last:border-0 surface-hover transition-colors', className)}
    {...props}
  >
    {children}
  </tr>
);
