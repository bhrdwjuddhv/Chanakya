import { useQuery } from '@tanstack/react-query';
import { Crosshair, ExternalLink, GitBranch, Route, X } from 'lucide-react';
import { get } from '../../lib/api';
import { Badge, Button, ErrorState, Spinner } from '../ui';
import { ENTITY_COLOURS, STATUS_STYLES } from '../../lib/utils';

export function NodeInspector({ nodeKey, onClose, onExpand, onFocus, onPathFrom, pathAnchor }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['graph-node', nodeKey],
    queryFn: () => get(`/graph/node/${encodeURIComponent(nodeKey)}`),
    enabled: Boolean(nodeKey),
  });

  const node = data?.node;

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
      <PanelHeader title="Entity" onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        {isLoading && <Spinner label="Loading entity" />}
        {error && <ErrorState error={error} />}

        {node && (
          <>
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: ENTITY_COLOURS[node.type] }} />
                <span className="label">{node.type}</span>
              </div>
              <h4 className="text-[17px] mt-2 leading-snug">{node.name}</h4>
              {node.aliases?.length > 0 && (
                <p className="text-[12px] text-muted-foreground mt-1.5">Also known as {node.aliases.join(', ')}</p>
              )}
            </div>

            <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
              <Metric label="Relationships" value={node.relationshipCount} />
              <Metric label="Cases" value={node.cases.length} />
            </div>

            {node.cases.length > 0 && (
              <Section title="Appears in">
                <div className="space-y-1.5">
                  {node.cases.map((c) => (
                    <a
                      key={c.caseId}
                      href={`/cases/${c.caseId}`}
                      className="flex items-center justify-between gap-2 rounded-control border border-border px-2.5 py-2 transition-colors hover:border-primary/40"
                    >
                      <span className="text-[12px] text-foreground truncate">{c.title}</span>
                      <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
                {node.cases.length > 1 && (
                  <p className="text-[11px] text-warning bg-warning/10 border border-warning/25 rounded-control px-2.5 py-2 mt-2.5 leading-snug">
                    This entity links {node.cases.length} separate cases.
                  </p>
                )}
              </Section>
            )}

            {Object.keys(node.attributes || {}).length > 0 && (
              <Section title="Attributes">
                <dl className="space-y-2">
                  {Object.entries(node.attributes).map(([key, value]) => (
                    <div key={key} className="flex gap-3 text-[12px]">
                      <dt className="text-muted-foreground shrink-0 capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </dt>
                      <dd className="text-foreground text-right ml-auto break-words">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}
          </>
        )}
      </div>

      {node && (
        <div className="border-t border-border p-3 space-y-1.5">
          <Button variant="secondary" size="sm" className="w-full" onClick={() => onExpand(node.key)}>
            <GitBranch className="size-3.5" /> Expand relationships
          </Button>
          <Button variant="secondary" size="sm" className="w-full" onClick={() => onFocus(node.key)}>
            <Crosshair className="size-3.5" /> Focus on this entity
          </Button>
          <Button
            variant={pathAnchor === node.key ? 'primary' : 'secondary'}
            size="sm"
            className="w-full"
            onClick={() => onPathFrom(node.key)}
          >
            <Route className="size-3.5" />
            {pathAnchor && pathAnchor !== node.key
              ? 'Find path from selected'
              : pathAnchor === node.key
                ? 'Pick a second entity…'
                : 'Find shortest path'}
          </Button>
        </div>
      )}
    </aside>
  );
}

function PanelHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
      <h3 className="label">{title}</h3>
      <button
        onClick={onClose}
        aria-label="Close panel"
        className="grid size-7 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="px-5 py-3.5">
      <p className="label">{label}</p>
      <p className="font-mono text-xl font-medium text-foreground tabular-nums mt-1">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="px-5 py-4 border-b border-border">
      <p className="label mb-2.5">{title}</p>
      {children}
    </div>
  );
}

/** Shown when an edge is clicked, so a suggested link can be confirmed or rejected. */
export function EdgeInspector({ edge, onClose, onReview, reviewing, canReview }) {
  const style = STATUS_STYLES[edge.status] || STATUS_STYLES.UNVERIFIED;

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card flex flex-col">
      <PanelHeader title="Relationship" onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[15px] font-semibold text-foreground">{edge.type.replace(/_/g, ' ')}</p>
          <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
            {edge.source.split(':').slice(1).join(':')} → {edge.target.split(':').slice(1).join(':')}
          </p>
        </div>

        <Section title="State">
          <Badge className={style.chip}>{style.label}</Badge>
          <div className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
            <div className="flex justify-between gap-2">
              <span>Confidence</span>
              <span className="font-mono text-foreground tabular-nums">
                {Math.round((edge.confidence ?? 0) * 100)}%
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Extracted by</span>
              <span className="font-mono text-foreground">{edge.extractionMethod || 'unknown'}</span>
            </div>
          </div>
        </Section>

        {edge.evidenceSnippet && (
          <Section title="Supporting text">
            <blockquote className="text-[12px] text-foreground leading-relaxed border-l-2 border-primary/50 pl-3 italic">
              {edge.evidenceSnippet}
            </blockquote>
          </Section>
        )}
      </div>

      {canReview && edge.status !== 'CONFIRMED' && (
        <div className="border-t border-border p-3 space-y-1.5">
          <p className="text-[11px] text-muted-foreground leading-snug mb-1.5">
            Confirming records that a person vouched for this link.
          </p>
          <Button size="sm" className="w-full" loading={reviewing} onClick={() => onReview('CONFIRMED')}>
            Confirm relationship
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={reviewing}
            onClick={() => onReview('UNVERIFIED')}
          >
            Mark unverified
          </Button>
        </div>
      )}
    </aside>
  );
}
