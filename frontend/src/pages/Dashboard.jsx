import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileStack, FolderOpen, Loader2, Users } from 'lucide-react';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/layout/PageHeader';
import { GridReveal } from '../components/layout/GridReveal';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Spinner, Stat, StatusPill } from '../components/ui';
import { PRIORITY_STYLES, formatDate } from '../lib/utils';

export function Dashboard() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => get('/cases/stats/dashboard'),
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <GridReveal />

      <PageHeader
        eyebrow="Overview"
        title={`Good ${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Open cases, evidence in the pipeline, and where the network stands today."
      />

      <div className="mx-auto max-w-[1200px] p-6 space-y-6">
        {isLoading && <Spinner label="Loading dashboard" />}
        {error && <ErrorState error={error} onRetry={refetch} />}

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={FolderOpen}
                label="Cases"
                value={data.totalCases}
                hint={`${data.byStatus?.active || 0} active`}
              />
              <Stat icon={FileStack} label="Evidence items" value={data.totalEvidence} hint="across all cases" />
              <Stat icon={Users} label="People on file" value={data.totalPersons} hint="linked to a case" />
              <Stat
                icon={Loader2}
                label="Processing"
                value={data.pendingProcessing}
                hint={data.pendingProcessing ? 'documents in the pipeline' : 'pipeline idle'}
                spin={data.pendingProcessing > 0}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader
                  title="Recent cases"
                  description="Most recently updated first"
                  actions={
                    data.pendingProcessing > 0 ? (
                      <StatusPill tone="warning" pulse>
                        {data.pendingProcessing} processing
                      </StatusPill>
                    ) : null
                  }
                />
                {data.recentCases.length === 0 ? (
                  <EmptyState
                    icon={FolderOpen}
                    title="No cases yet"
                    description="Run the seed script or create a case to get started."
                  />
                ) : (
                  <ul>
                    {data.recentCases.map((c) => (
                      <li key={c._id} className="border-b border-border/60 last:border-0">
                        <Link
                          to={`/cases/${c._id}`}
                          className="flex items-center justify-between gap-4 px-5 py-3 surface-hover transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-normal text-muted-foreground">
                                {c.caseNumber}
                              </span>
                              <Badge className={PRIORITY_STYLES[c.priority]}>{c.priority}</Badge>
                            </div>
                            <p className="text-[13px] font-medium text-foreground mt-1 truncate">{c.title}</p>
                          </div>
                          <span className="font-mono text-[11px] font-normal text-muted-foreground shrink-0">
                            {formatDate(c.updatedAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <CardHeader title="Caseload" description="By status and priority" />
                <div className="p-5 space-y-6">
                  <Breakdown title="Status" data={data.byStatus} total={data.totalCases} />
                  <Breakdown title="Priority" data={data.byPriority} total={data.totalCases} />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Breakdown({ title, data, total }) {
  const entries = Object.entries(data || {});
  return (
    <div>
      <p className="label mb-2.5">{title}</p>
      {entries.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nothing to show</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, count]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[12px] text-muted-foreground capitalize w-28 shrink-0">
                {key.replace('_', ' ')}
              </span>
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-signature"
                  style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                />
              </div>
              <span className="font-mono text-[12px] font-normal text-muted-foreground tabular-nums w-5 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  return hour < 18 ? 'afternoon' : 'evening';
}
