import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { get } from '../lib/api';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge, Card, EmptyState, ErrorState, Input, Spinner } from '../components/ui';
import { ENTITY_COLOURS } from '../lib/utils';

export function People() {
  const [q, setQ] = useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['persons', 'all', q],
    queryFn: () => get(`/persons${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });

  const persons = data?.persons || [];
  const crossCase = persons.filter((p) => p.caseIds?.length > 1);

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Workspace"
        title="People"
        description="Everyone on file, across every case. People appearing in more than one case are flagged."
      >
        <div className="relative max-w-sm mt-4">
          <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by name or alias"
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </PageHeader>

      <div className="mx-auto max-w-[1200px] p-6 space-y-4">
        {isLoading && <Spinner label="Loading people" />}
        {error && <ErrorState error={error} onRetry={refetch} />}

        {crossCase.length > 0 && (
          <div className="rounded-control border border-warning/25 bg-warning/12 px-3 py-2 text-xs text-warning">
            {crossCase.length} {crossCase.length === 1 ? 'person appears' : 'people appear'} in more than one case:{' '}
            {crossCase.map((p) => p.name).join(', ')}. Shared entities are often where separate investigations
            actually connect.
          </div>
        )}

        {data && persons.length === 0 && (
          <Card>
            <EmptyState icon={Users} title="No people match" description="Try a different name or alias." />
          </Card>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {persons.map((person) => (
            <Card key={person._id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: ENTITY_COLOURS.Person }} />
                <h3 className="text-sm font-semibold text-foreground">{person.name}</h3>
                {person.role && (
                  <Badge className="ml-auto capitalize">{person.role.replace('_', ' ')}</Badge>
                )}
              </div>

              {person.aliases?.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">Also known as {person.aliases.join(', ')}</p>
              )}
              {person.notes && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{person.notes}</p>}

              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/60">
                {person.caseIds?.map((c) => (
                  <Link key={c._id} to={`/cases/${c._id}`}>
                    <Badge className="hover:border-primary/40">{c.caseNumber}</Badge>
                  </Link>
                ))}
                {person.caseIds?.length > 1 && (
                  <Badge className="bg-warning/12 text-warning border-warning/25">cross-case</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
