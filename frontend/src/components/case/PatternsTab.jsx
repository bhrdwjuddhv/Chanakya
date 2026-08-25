import { useQuery } from '@tanstack/react-query';
import { GitFork, Layers, ShieldCheck, TriangleAlert, UserSearch } from 'lucide-react';
import { get } from '../../lib/api';
import { Badge, Card, EmptyState, ErrorState, Spinner } from '../ui';
import { ENTITY_COLOURS, formatDateTime } from '../../lib/utils';

const RULE_META = {
  cross_case_bridge: { icon: Layers, label: 'Cross-case bridge' },
  shared_intermediary: { icon: GitFork, label: 'Shared intermediary' },
  unnamed_broker: { icon: UserSearch, label: 'Unnamed broker' },
  community_bridge: { icon: GitFork, label: 'Community bridge' },
};

const SEVERITY = {
  high: 'bg-destructive/12 text-destructive border-destructive/30',
  medium: 'bg-warning/12 text-warning border-warning/25',
  low: 'bg-muted text-muted-foreground border-border',
};

export function PatternsTab({ caseId }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['patterns', caseId],
    queryFn: () => get(`/patterns/case/${caseId}`),
    retry: false,
  });

  if (isLoading) return <Spinner label="Checking the graph against the pattern rules" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Four structural rules, run over the case graph. Deterministic — every flag traces back to the
          structure that produced it. Last checked {formatDateTime(data.checkedAt)}.
        </p>
      </div>

      {!data.gdsAvailable && (
        <p className="text-xs text-warning bg-warning/12 border border-warning/25 rounded-control px-3 py-2">
          Neo4j GDS is unavailable, so the broker and community-bridge rules did not run. Cross-case and
          shared-intermediary results below are complete.
        </p>
      )}

      {data.findings.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No structural flags on this case"
            description="None of the four rules matched. That is a statement about the recorded graph, not about the case."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.findings.map((finding, i) => {
            const meta = RULE_META[finding.rule] || { icon: TriangleAlert, label: finding.rule };
            return (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <meta.icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{finding.title}</h3>
                      <Badge className={SEVERITY[finding.severity]}>{finding.severity}</Badge>
                      <Badge>{meta.label}</Badge>
                    </div>

                    {finding.entity?.name && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: ENTITY_COLOURS[finding.entity.type] }}
                        />
                        <span className="text-sm text-foreground">{finding.entity.name}</span>
                        <span className="text-[11px] text-muted-foreground">{finding.entity.type}</span>
                      </div>
                    )}

                    <p className="text-sm text-foreground mt-2 leading-relaxed">{finding.observation}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{finding.detail}</p>

                    {finding.references?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {finding.references.map((ref) => (
                          <a key={ref.caseId} href={`/cases/${ref.caseId}`}>
                            <Badge className="hover:border-primary/40">
                              {ref.caseNumber} · {ref.title}
                            </Badge>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
        Each finding states what was observed in the graph, not what it means. A shared intermediary is the
        shape of a pass-through arrangement and equally the shape of an ordinary shared supplier — the
        structure alone does not distinguish them.
      </p>
    </div>
  );
}
