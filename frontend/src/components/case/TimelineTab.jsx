import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, MapPin } from 'lucide-react';
import { get } from '../../lib/api';
import { Badge, Card, EmptyState, ErrorState, Select, Spinner } from '../ui';
import { formatDateTime } from '../../lib/utils';

const TYPE_COLOURS = {
  event: 'bg-muted text-muted-foreground border-border',
  movement: 'bg-info/12 text-info border-info/25',
  communication: 'bg-ai/12 text-ai border-ai/25',
  transaction: 'bg-warning/12 text-warning border-warning/25',
  evidence: 'bg-success/12 text-success border-success/25',
  biometric: 'bg-destructive/12 text-destructive border-destructive/30',
};

export function TimelineTab({ caseId }) {
  const [type, setType] = useState('');
  const [personId, setPersonId] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['timeline', caseId],
    queryFn: () => get(`/timeline/case/${caseId}`),
  });

  const people = useMemo(() => {
    const map = new Map();
    for (const event of data?.events || []) {
      for (const person of event.personIds || []) map.set(person._id, person.name);
    }
    return [...map.entries()];
  }, [data]);

  const events = (data?.events || []).filter(
    (e) => (!type || e.type === type) && (!personId || e.personIds?.some((p) => p._id === personId)),
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All event types</option>
          {Object.keys(TYPE_COLOURS).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
          <option value="">Anyone involved</option>
          {people.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
        <span className="text-xs text-muted-foreground ml-1">
          {events.length} of {data?.events.length ?? 0} events
        </span>
      </div>

      {isLoading && <Spinner label="Loading timeline" />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data && events.length === 0 && (
        <Card>
          <EmptyState
            icon={CalendarClock}
            title="No events match"
            description="Clear the filters, or add events as the investigation progresses."
          />
        </Card>
      )}

      {events.length > 0 && (
        <ol className="relative border-l-2 border-border ml-3 space-y-5">
          {events.map((event) => (
            <li key={event._id} className="ml-6">
              <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full border-2 border-white bg-primary" />
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <time className="text-xs font-mono text-muted-foreground">{formatDateTime(event.occurredAt)}</time>
                  <Badge className={TYPE_COLOURS[event.type] || TYPE_COLOURS.event}>{event.type}</Badge>
                </div>

                <h4 className="text-sm font-medium text-foreground mt-1.5">{event.title}</h4>
                {event.description && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[11px] text-muted-foreground">
                  {event.locationId && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {event.locationId.name}
                    </span>
                  )}
                  {event.personIds?.length > 0 && <span>{event.personIds.map((p) => p.name).join(', ')}</span>}
                  {event.source && <span className="font-mono text-muted-foreground">source: {event.source}</span>}
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
