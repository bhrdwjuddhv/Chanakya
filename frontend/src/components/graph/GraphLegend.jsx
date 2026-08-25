import { ENTITY_COLOURS, STATUS_STYLES } from '../../lib/utils';

export function GraphLegend({ activeTypes }) {
  const types = Object.entries(ENTITY_COLOURS).filter(([type]) =>
    activeTypes ? activeTypes.includes(type) : type !== 'Case',
  );

  return (
    <div className="absolute bottom-4 left-4 rounded-card border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-card">
      <div className="flex gap-7">
        <div>
          <p className="label mb-2">Entity</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {types.map(([type, colour]) => (
              <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="size-2 rounded-full shrink-0" style={{ background: colour }} />
                {type}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="label mb-2">Relationship</p>
          <div className="space-y-1.5">
            {Object.entries(STATUS_STYLES).map(([status, style]) => (
              <span key={status} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <svg width="20" height="6" className="shrink-0">
                  <line
                    x1="0"
                    y1="3"
                    x2="20"
                    y2="3"
                    stroke={style.fallback}
                    strokeWidth="2"
                    strokeDasharray={style.dash ? style.dash.join(' ') : undefined}
                    opacity={status === 'UNVERIFIED' ? 0.5 : 1}
                  />
                </svg>
                {style.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border max-w-64 leading-snug">
        Only <span className="text-success font-medium">confirmed</span> links have been verified by a person.
        Everything else awaits review.
      </p>
    </div>
  );
}
