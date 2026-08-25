import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Globe, Plus, Search, X } from 'lucide-react';
import { get, post } from '../../lib/api';
import { useAuth, can } from '../../lib/auth';
import { Badge, Button, Card, EmptyState, Input, Select, Spinner } from '../ui';
import { ENTITY_COLOURS } from '../../lib/utils';

const KINDS = ['name', 'email', 'phone', 'username', 'company'];

export function OsintTab({ caseId }) {
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('name');
  const [sources, setSources] = useState([]);
  const [result, setResult] = useState(null);

  const connectorQuery = useQuery({ queryKey: ['osint-connectors'], queryFn: () => get('/osint/connectors') });

  const searchMutation = useMutation({
    mutationFn: () => post('/osint/search', { query, kind, caseId, sources: sources.length ? sources : undefined }),
    onSuccess: setResult,
  });

  const connectors = connectorQuery.data?.connectors || [];

  return (
    <div className="mx-auto max-w-[1200px] p-6 space-y-5">
      <Card className="p-5">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim().length >= 2) searchMutation.mutate();
          }}
        >
          <div className="flex-1 min-w-64">
            <label className="label block mb-2">Selector</label>
            <div className="relative">
              <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                className="pl-8"
                placeholder="A name, email, phone number or company"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label block mb-2">Kind</label>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" loading={searchMutation.isPending} disabled={query.trim().length < 2}>
            Search sources
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="label mb-2">Sources</p>
          {connectorQuery.isLoading && <Spinner label="Loading connectors" className="py-3" />}
          <div className="flex flex-wrap gap-1.5">
            {connectors.map((connector) => {
              const active = sources.length === 0 || sources.includes(connector.id);
              return (
                <button
                  key={connector.id}
                  type="button"
                  title={connector.description}
                  onClick={() =>
                    setSources((prev) =>
                      prev.includes(connector.id)
                        ? prev.filter((s) => s !== connector.id)
                        : [...(prev.length ? prev : connectors.map((c) => c.id)).filter((s) => s !== connector.id), connector.id],
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-[11px] transition-colors ${
                    active
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  <Globe className="size-3" />
                  {connector.name}
                  <span className="text-muted-foreground">· {connector.dataSource}</span>
                </button>
              );
            })}
          </div>
          {connectorQuery.data?.notice && (
            <p className="text-[11px] text-muted-foreground mt-2.5 leading-snug max-w-3xl">
              {connectorQuery.data.notice}
            </p>
          )}
        </div>

        {searchMutation.error && (
          <p className="text-[13px] text-destructive mt-3">{searchMutation.error.message}</p>
        )}
      </Card>

      {searchMutation.isPending && <Spinner label="Querying sources" />}

      {result && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {result.sources.map((source) => (
              <Badge
                key={source.id}
                className={source.error ? 'bg-destructive/12 text-destructive border-destructive/30' : undefined}
              >
                {source.name}: {source.error ? source.error : `${source.hits} hit${source.hits === 1 ? '' : 's'}`}
              </Badge>
            ))}
          </div>

          {result.findings.length === 0 ? (
            <Card>
              <EmptyState
                icon={Search}
                title="No records matched that selector"
                description="A negative result across the configured sources is still a result."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {result.findings.map((finding) => (
                <FindingCard
                  key={finding._id}
                  finding={finding}
                  caseId={caseId}
                  canAccept={can(user, 'confirmRelationship')}
                  onChanged={() => {
                    queryClient.invalidateQueries({ queryKey: ['graph', caseId] });
                    queryClient.invalidateQueries({ queryKey: ['case', caseId] });
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FindingCard({ finding, caseId, canAccept, onChanged }) {
  const [status, setStatus] = useState(finding.status);

  const mutation = useMutation({
    mutationFn: (action) =>
      post(`/osint/findings/${finding._id}/${action}`, action === 'accept' ? { caseId } : {}),
    onSuccess: (_data, action) => {
      setStatus(action === 'accept' ? 'accepted' : 'dismissed');
      onChanged?.();
    },
  });

  const newEntities = finding.entities.filter((e) => e.resolution === 'new');

  return (
    <Card className={`p-5 ${status === 'accepted' ? 'border-info/30' : ''}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-semibold text-foreground">{finding.title}</h3>
            <Badge>{finding.recordKind?.replace(/-/g, ' ')}</Badge>
            <Badge className="font-mono !font-normal">{finding.sourceName}</Badge>
            {status === 'accepted' && (
              <Badge className="bg-info/12 text-info border-info/25">added to graph</Badge>
            )}
            {status === 'dismissed' && <Badge>dismissed</Badge>}
          </div>
          {finding.note && <p className="text-[13px] text-warning mt-2 leading-relaxed">{finding.note}</p>}
        </div>
        <span className="font-mono text-[11px] font-normal text-muted-foreground shrink-0">
          {Math.round((finding.confidence ?? 0) * 100)}% · {finding.sourceId}
        </span>
      </div>

      {Object.keys(finding.attributes || {}).length > 0 && (
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 mt-3.5">
          {Object.entries(finding.attributes).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-[12px] border-b border-border/40 py-1">
              <dt className="text-muted-foreground capitalize shrink-0">{key}</dt>
              <dd className="text-foreground text-right ml-auto">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4">
        <p className="label mb-2">
          Entity resolution
          {newEntities.length > 0 && (
            <span className="text-primary ml-2 normal-case tracking-normal">
              {newEntities.length} new to this case
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {finding.entities.map((entity, i) => (
            <Badge
              key={i}
              dot={ENTITY_COLOURS[entity.type]}
              className={
                entity.resolution === 'new'
                  ? 'bg-primary/10 text-foreground border-primary/30'
                  : undefined
              }
            >
              {entity.name}
              <span className="text-muted-foreground">
                {entity.resolution === 'new' ? 'new' : 'known'}
              </span>
            </Badge>
          ))}
        </div>
      </div>

      {status === 'new' && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
          {canAccept ? (
            <>
              <Button size="sm" loading={mutation.isPending} onClick={() => mutation.mutate('accept')}>
                <Plus className="size-3.5" /> Add to case graph
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate('dismiss')}
              >
                <X className="size-3.5" /> Dismiss
              </Button>
              <p className="text-[11px] text-muted-foreground ml-1">
                Open-source material enters the graph as <span className="text-info">inferred</span>, never
                confirmed.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Your role cannot write to the case graph.
            </p>
          )}
        </div>
      )}

      {status === 'accepted' && (
        <p className="flex items-center gap-1.5 text-[11px] text-info mt-3 pt-3 border-t border-border">
          <Check className="size-3" />
          Entities and the source record are now in the graph, marked inferred and attributed to{' '}
          {finding.sourceName}.
        </p>
      )}

      {mutation.error && <p className="text-[13px] text-destructive mt-2">{mutation.error.message}</p>}
    </Card>
  );
}
