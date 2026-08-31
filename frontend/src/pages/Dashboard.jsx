import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileStack, FolderOpen, Loader2, Users } from 'lucide-react';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { PageHeader } from '../components/layout/PageHeader';
import { GridReveal } from '../components/layout/GridReveal';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Spinner, Stat, StatusPill } from '../components/ui';
import { PRIORITY_STYLES, formatDate } from '../lib/utils';

export function Dashboard() {
  const user = useAuth((s) => s.user);
  const { t, lang } = useI18n();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => get('/cases/stats/dashboard'),
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning', 'Good morning');
    if (hour < 18) return t('goodAfternoon', 'Good afternoon');
    return t('goodEvening', 'Good evening');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <GridReveal />

      <PageHeader
        eyebrow={t('overview', 'Overview')}
        title={`${getGreeting()}, ${user?.name?.split(' ')[0] || (lang === 'hi' ? 'अधिकारी महोदय' : 'Officer')}`}
        description={t('dashboardSubtitle', 'Open cases, evidence in the pipeline, and where the network stands today.')}
      />

      <div className="mx-auto max-w-[1200px] p-6 space-y-6">
        {isLoading && <Spinner label={t('processing', 'Loading dashboard')} />}
        {error && <ErrorState error={error} onRetry={refetch} />}

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={FolderOpen}
                label={t('totalCases', 'Cases')}
                value={data.totalCases}
                hint={`${data.byStatus?.active || 0} ${t('active', 'active')}`}
              />
              <Stat icon={FileStack} label={t('evidenceItems', 'Evidence items')} value={data.totalEvidence} hint={t('acrossAllCases', 'across all cases')} />
              <Stat icon={Users} label={t('peopleOnFile', 'People on file')} value={data.totalPersons} hint={t('linkedToCase', 'linked to a case')} />
              <Stat
                icon={Loader2}
                label={t('processing', 'Processing')}
                value={data.pendingProcessing}
                hint={data.pendingProcessing ? t('docsInPipeline', 'documents in the pipeline') : t('pipelineIdle', 'pipeline idle')}
                spin={data.pendingProcessing > 0}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader
                  title={t('recentCases', 'Recent cases')}
                  description={t('mostRecentlyUpdated', 'Most recently updated first')}
                  actions={
                    data.pendingProcessing > 0 ? (
                      <StatusPill tone="warning" pulse>
                        {data.pendingProcessing} {t('processing', 'processing')}
                      </StatusPill>
                    ) : null
                  }
                />
                {data.recentCases.length === 0 ? (
                  <EmptyState
                    icon={FolderOpen}
                    title={t('noCasesYet', 'No cases yet')}
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
                <CardHeader title={t('caseload', 'Caseload')} description={t('byStatusAndPriority', 'By status and priority')} />
                <div className="p-5 space-y-6">
                  <Breakdown title={t('status', 'Status')} data={data.byStatus} total={data.totalCases} />
                  <Breakdown title={t('priority', 'Priority')} data={data.byPriority} total={data.totalCases} />
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

