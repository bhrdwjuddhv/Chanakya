import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, FileStack, MapPin, Network, Users } from 'lucide-react';
import { get } from '../../lib/api';
import { Badge, Card, CardHeader, EmptyState, Spinner, Stat } from '../ui';
import { ENTITY_COLOURS, formatDate } from '../../lib/utils';

export function OverviewTab({ caseData, onOpenTab }) {
  const { stats } = caseData;

  const personsQuery = useQuery({
    queryKey: ['persons', caseData._id],
    queryFn: () => get(`/persons?caseId=${caseData._id}`),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Network} label="Graph entities" value={stats.nodeCount} onClick={() => onOpenTab('graph')} />
        <Stat icon={Network} label="Relationships" value={stats.relationshipCount} onClick={() => onOpenTab('graph')} />
        <Stat icon={FileStack} label="Evidence" value={stats.evidenceCount} onClick={() => onOpenTab('evidence')} />
        <Stat icon={CalendarClock} label="Timeline events" value={stats.timelineCount} onClick={() => onOpenTab('timeline')} />
        <Stat icon={MapPin} label="Locations" value={stats.locationCount} onClick={() => onOpenTab('map')} />
      </div>

      {stats.nodeCount === null && (
        <p className="text-xs text-warning bg-warning/12 border border-warning/25 rounded-control px-3 py-2">
          Neo4j is unreachable, so graph counts and influencer analysis are unavailable. The rest of the case is
          unaffected.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Case summary" />
          <div className="p-4 space-y-4">
            <p className="text-sm text-foreground leading-relaxed">{caseData.description || 'No description.'}</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-border/60">
              <Field label="Case number" value={caseData.caseNumber} mono />
              <Field label="Status" value={caseData.status.replace('_', ' ')} />
              <Field label="Priority" value={caseData.priority} />
              <Field label="Classification" value={caseData.classification} />
              <Field label="Opened" value={formatDate(caseData.createdAt)} />
              <Field label="Last updated" value={formatDate(caseData.updatedAt)} />
            </dl>
            {caseData.assignedUsers?.length > 0 && (
              <div className="pt-3 border-t border-border/60">
                <p className="label mb-2">Assigned</p>
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
          <CardHeader title="People on this case" description={`${personsQuery.data?.persons.length ?? 0} on file`} />
          {personsQuery.isLoading && <Spinner label="Loading" className="py-6" />}
          {personsQuery.data?.persons.length === 0 && (
            <EmptyState icon={Users} title="No people recorded" className="py-8" />
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
                      {person.role.replace('_', ' ')}
                    </span>
                  )}
                </div>
                {person.caseIds?.length > 1 && (
                  <p className="text-[11px] text-warning mt-1 ml-4">Appears in {person.caseIds.length} cases</p>
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
