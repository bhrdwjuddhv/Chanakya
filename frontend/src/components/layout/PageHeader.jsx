import { cn } from '../../lib/utils';

export function PageHeader({ eyebrow, title, description, actions, className, children }) {
  return (
    <div className={cn('border-b border-border bg-background px-6 py-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="label mb-1.5">{eyebrow}</p>}
          <h1 className="text-[28px] leading-tight">{title}</h1>
          {description && (
            <p className="text-[13px] text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
