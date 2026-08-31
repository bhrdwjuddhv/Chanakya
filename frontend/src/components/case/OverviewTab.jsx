import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, FileStack, MapPin, Network, Users } from 'lucide-react';
import { get } from '../../lib/api';
import { Badge, Card, CardHeader, EmptyState, Spinner, Stat } from '../ui';
import { ENTITY_COLOURS, formatDate } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

export function OverviewTab({ caseData, onOpenTab }) {
  const { stats } = caseData;
  const { t, lang } = useI18n();

  const personsQuery = useQuery({
    queryKey: ['persons', caseData._id],
    queryFn: () => get(`/persons?caseId=${caseData._id}`),
  });

  const getRoleLabel = (role) => {
    if (lang !== 'hi') return role?.replace('_', ' ');
    if (role === 'suspect') return 'संदिग्ध अभियुक्त';
    if (role === 'victim') return 'पीड़ित / वादी';
    if (role === 'witness') return 'गवाह';
    if (role === 'person_of_interest') return 'संशयित व्यक्ति (POI)';
    return role?.replace('_', ' ');
  };

  const getStatusLabel = (status) => {
    if (lang !== 'hi') return status?.replace('_', ' ');
    if (status === 'active') return 'सक्रिय अनुसंधान';
    if (status === 'open') return 'खुला';
    if (status === 'pending_review') return 'समीक्षाधीन';
    if (status === 'closed') return 'निस्तारित';
    return status?.replace('_', ' ');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Network} label={t('graphEntities', 'Graph entities')} value={stats.nodeCount} onClick={() => onOpenTab('graph')} />
        <Stat icon={Network} label={t('relationships', 'Relationships')} value={stats.relationshipCount} onClick={() => onOpenTab('graph')} />
        <Stat icon={FileStack} label={t('evidence', 'Evidence')} value={stats.evidenceCount} onClick={() => onOpenTab('evidence')} />
        <Stat icon={CalendarClock} label={t('timelineEvents', 'Timeline events')} value={stats.timelineCount} onClick={() => onOpenTab('timeline')} />
        <Stat icon={MapPin} label={t('map', 'Locations')} value={stats.locationCount} onClick={() => onOpenTab('map')} />
      </div>

      {stats.nodeCount === null && (
        <p className="text-xs text-warning bg-warning/12 border border-warning/25 rounded-control px-3 py-2">
          {t('neo4jUnreachable', 'Neo4j is unreachable, so graph counts and influencer analysis are unavailable.')}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t('caseSummary', 'Case summary')} />
          <div className="p-4 space-y-4">
            <p className="text-sm text-foreground leading-relaxed">{caseData.description || t('noDescription', 'No description.')}</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-border/60">
              <Field label={t('caseNumber', 'Case number')} value={caseData.caseNumber} mono />
              <Field label={t('status', 'Status')} value={getStatusLabel(caseData.status)} />
              <Field label={t('priority', 'Priority')} value={caseData.priority} />
              <Field label={t('classification', 'Classification')} value={caseData.classification} />
              <Field label={t('opened', 'Opened')} value={formatDate(caseData.createdAt)} />
              <Field label={t('lastUpdated', 'Last updated')} value={formatDate(caseData.updatedAt)} />
            </dl>
            {caseData.assignedUsers?.length > 0 && (
              <div className="pt-3 border-t border-border/60">
                <p className="label mb-2">{t('assigned', 'Assigned Team')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {caseData.assignedUsers.map((user) => (
                    <Badge key={user._id}>
                      {user.name}
                      <span className="text-muted-foreground capitalize">· {user.role}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t('peopleOnCase', 'People on this case')}
            description={`${personsQuery.data?.persons.length ?? 0} ${t('onFile', 'on file')}`}
          />
          {personsQuery.isLoading && <Spinner label={t('processing', 'Loading')} className="py-6" />}
          {personsQuery.data?.persons.length === 0 && (
            <EmptyState icon={Users} title={t('noPeopleRecorded', 'No people recorded')} className="py-8" />
          )}
          <ul className="divide-y divide-border/60 max-h-96 overflow-y-auto">
            {personsQuery.data?.persons.map((person) => (
              <li key={person._id} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: ENTITY_COLOURS.Person }} />
                  <Link to={`/people?focus=${person._id}`} className="text-sm text-foreground hover:text-primary">
                    {person.name}
                  </Link>
                  {person.role && (
                    <span className="text-[11px] text-muted-foreground ml-auto capitalize">
                      {getRoleLabel(person.role)}
                    </span>
                  )}
                </div>
                {person.caseIds?.length > 1 && (
                  <p className="text-[11px] text-warning mt-1 ml-4">
                    {lang === 'hi'
                      ? `${person.caseIds.length} अन्य मामलों में सक्रिय`
                      : `Appears in ${person.caseIds.length} cases`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={`text-[13px] text-foreground capitalize mt-1 ${mono ? 'font-mono font-normal normal-case' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

