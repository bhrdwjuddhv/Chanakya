import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crosshair, Maximize2, Network, RefreshCw, Route, Sparkles, X } from 'lucide-react';
import { get, patch } from '../../lib/api';
import { useAuth, can } from '../../lib/auth';
import { RelationshipGraph, encodeNodes } from '../graph/RelationshipGraph';
import { GraphLegend } from '../graph/GraphLegend';
import { EdgeInspector, NodeInspector } from '../graph/NodeInspector';
import { InfluencerPanel } from './InfluencerPanel';
import { Button, EmptyState, ErrorState, Select, Spinner } from '../ui';
import { ENTITY_COLOURS, STATUS_STYLES, cn } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

const ENTITY_TYPES = Object.keys(ENTITY_COLOURS).filter((t) => t !== 'Case');

export function GraphTab({ caseId }) {
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const graphRef = useRef(null);
  const { t, lang } = useI18n();

  const [types, setTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [minConfidence, setMinConfidence] = useState(0);
  const [colourBy, setColourBy] = useState('type');
  const [sizeBy, setSizeBy] = useState('degree');

  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [expanded, setExpanded] = useState({ nodes: [], edges: [] });
  const [focusKey, setFocusKey] = useState(null);
  const [pathAnchor, setPathAnchor] = useState(null);
  const [path, setPath] = useState(null);
  const [showInfluencers, setShowInfluencers] = useState(true);

  const params = new URLSearchParams();
  if (types.length) params.set('types', types.join(','));
  if (statuses.length) params.set('statuses', statuses.join(','));
  if (minConfidence) params.set('minConfidence', String(minConfidence));

  const graphQuery = useQuery({
    queryKey: ['graph', caseId, params.toString()],
    queryFn: () => get(`/graph/case/${caseId}?${params}`),
  });

  const influencerQuery = useQuery({
    queryKey: ['influencers', caseId],
    queryFn: () => get(`/graph/case/${caseId}/influencers?limit=8`),
    retry: false,
  });

  // Centrality drives node size and community colour. Keyed by entity key.
  const centrality = useMemo(() => {
    const entities = influencerQuery.data?.entities || [];
    return Object.fromEntries(entities.map((e) => [e.key, e]));
  }, [influencerQuery.data]);

  const elements = useMemo(() => {
    if (!graphQuery.data) return null;
    return {
      nodes: encodeNodes(dedupe([...graphQuery.data.nodes, ...expanded.nodes]), {
        centrality,
        colourBy,
        sizeBy,
      }),
      edges: dedupe([...graphQuery.data.edges, ...expanded.edges]),
    };
  }, [graphQuery.data, expanded, centrality, colourBy, sizeBy]);

  const reviewMutation = useMutation({
    mutationFn: ({ relationshipId, status }) => patch('/graph/relationships/review', { relationshipId, status }),
    onSuccess: (_, variables) => {
      setSelectedEdge((edge) => (edge ? { ...edge, status: variables.status } : edge));
      queryClient.invalidateQueries({ queryKey: ['graph', caseId] });
    },
  });

  async function expandNode(key) {
    const result = await get(`/graph/node/${encodeURIComponent(key)}/expand`);
    setExpanded((prev) => ({
      nodes: dedupe([...prev.nodes, ...result.nodes]),
      edges: dedupe([...prev.edges, ...result.edges]),
    }));
    setFocusKey(null);
  }

  async function handlePathFrom(key) {
    if (!pathAnchor) return setPathAnchor(key);
    if (pathAnchor === key) return setPathAnchor(null);

    const result = await get(
      `/graph/path?from=${encodeURIComponent(pathAnchor)}&to=${encodeURIComponent(key)}`,
    );
    setPathAnchor(null);
    setFocusKey(null);
    if (!result.found) return setPath({ found: false });

    // The path may run through entities that aren't on this case — add them in.
    setExpanded((prev) => ({
      nodes: dedupe([...prev.nodes, ...result.nodes]),
      edges: dedupe([...prev.edges, ...result.edges]),
    }));
    setPath({
      found: true,
      hops: result.hops,
      ids: [...result.nodes.map((n) => n.data.id), ...result.edges.map((e) => e.data.id)],
      from: pathAnchor,
      to: key,
    });
  }

  function clearOverlays() {
    setPath(null);
    setFocusKey(null);
    setPathAnchor(null);
    setExpanded({ nodes: [], edges: [] });
  }

  const hasOverlay = path || focusKey || expanded.nodes.length > 0;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 border-b border-border bg-card">
          <FilterChips
            label="Entities"
            options={ENTITY_TYPES}
            selected={types}
            onToggle={(t) => setTypes(toggle(types, t))}
            colours={ENTITY_COLOURS}
          />
          <FilterChips
            label="Link state"
            options={Object.keys(STATUS_STYLES)}
            selected={statuses}
            onToggle={(s) => setStatuses(toggle(statuses, s))}
            colours={Object.fromEntries(Object.entries(STATUS_STYLES).map(([k, v]) => [k, v.fallback]))}
            format={(s) => STATUS_STYLES[s].label}
          />

          <label className="flex items-center gap-2">
            <span className="label">Min confidence</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-20 accent-primary"
            />
            <span className="font-mono text-[11px] font-normal text-muted-foreground tabular-nums w-8">{Math.round(minConfidence * 100)}%</span>
          </label>

          <div className="flex items-center gap-2 ml-auto">
            <Select value={sizeBy} onChange={(e) => setSizeBy(e.target.value)} className="h-7 text-xs">
              <option value="degree">Size: connections</option>
              <option value="betweenness">Size: betweenness</option>
              <option value="pagerank">Size: PageRank</option>
              <option value="influenceScore">Size: influence</option>
            </Select>
            <Select value={colourBy} onChange={(e) => setColourBy(e.target.value)} className="h-7 text-xs">
              <option value="type">Colour: entity type</option>
              <option value="community">Colour: community</option>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => graphRef.current?.relayout()} title="Re-run layout">
              <RefreshCw className="size-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => graphRef.current?.fit()} title="Fit to screen">
              <Maximize2 className="size-3.5" />
            </Button>
            <Button
              variant={showInfluencers ? 'subtle' : 'ghost'}
              size="sm"
              onClick={() => setShowInfluencers((v) => !v)}
            >
              <Sparkles className="size-3.5" /> Influencers
            </Button>
          </div>
        </div>

        {(hasOverlay || pathAnchor) && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border-b border-primary/25 text-xs text-primary">
            {pathAnchor && !path && (
              <>
                <Route className="size-3.5" />
                Path start set. Select a second entity and choose “Find path from selected”.
              </>
            )}
            {path?.found && (
              <>
                <Route className="size-3.5" />
                Shortest path found — {path.hops} hop{path.hops === 1 ? '' : 's'}.
              </>
            )}
            {path && !path.found && (
              <>
                <Route className="size-3.5" />
                No path exists between those two entities within 6 hops.
              </>
            )}
            {focusKey && !path && (
              <>
                <Crosshair className="size-3.5" /> Focused on one entity and its immediate neighbours.
              </>
            )}
            {expanded.nodes.length > 0 && !path && !focusKey && (
              <>
                <Network className="size-3.5" /> {expanded.nodes.length} entities added by expansion.
              </>
            )}
            <button onClick={clearOverlays} className="ml-auto inline-flex items-center gap-1 hover:underline">
              <X className="size-3" /> Reset view
            </button>
          </div>
        )}

        <div className="flex-1 relative min-h-0">
          {graphQuery.isLoading && <Spinner label="Building relationship graph" />}
          {graphQuery.error && <ErrorState error={graphQuery.error} onRetry={graphQuery.refetch} />}
          {elements?.nodes.length === 0 && (
            <EmptyState
              icon={Network}
              title="Nothing matches these filters"
              description="Loosen the entity or link-state filters, or lower the confidence threshold."
            />
          )}

          {elements?.nodes.length > 0 && (
            <>
              <RelationshipGraph
                ref={graphRef}
                elements={elements}
                selectedKey={selectedKey}
                pathIds={path?.found ? path.ids : null}
                focusKey={focusKey}
                onSelectNode={(key) => {
                  setSelectedKey(key);
                  setSelectedEdge(null);
                }}
                onSelectEdge={(edge) => {
                  setSelectedEdge(edge);
                  setSelectedKey(null);
                }}
              />
              <GraphLegend activeTypes={types.length ? types : null} />
              <div className="absolute top-3 right-3 rounded-control border border-border bg-card/95 px-2.5 py-1 text-[11px] text-muted-foreground tabular-nums">
                {elements.nodes.length} entities · {elements.edges.length} relationships
              </div>
            </>
          )}
        </div>
      </div>

      {showInfluencers && !selectedKey && !selectedEdge && (
        <InfluencerPanel
          query={influencerQuery}
          onSelect={(key) => {
            setSelectedKey(key);
            graphRef.current?.centreOn(key);
          }}
          onClose={() => setShowInfluencers(false)}
        />
      )}

      {selectedKey && (
        <NodeInspector
          nodeKey={selectedKey}
          caseId={caseId}
          pathAnchor={pathAnchor}
          onClose={() => setSelectedKey(null)}
          onExpand={expandNode}
          onFocus={(key) => {
            setFocusKey(key);
            setPath(null);
          }}
          onPathFrom={handlePathFrom}
        />
      )}

      {selectedEdge && (
        <EdgeInspector
          edge={selectedEdge}
          canReview={can(user, 'confirmRelationship')}
          reviewing={reviewMutation.isPending}
          onClose={() => setSelectedEdge(null)}
          onReview={(status) => reviewMutation.mutate({ relationshipId: selectedEdge.id, status })}
        />
      )}
    </div>
  );
}

function FilterChips({ label, options, selected, onToggle, colours, format = (v) => v }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              onClick={() => onToggle(option)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                active
                  ? 'border-muted-foreground bg-muted text-foreground font-medium'
                  : 'border-border text-muted-foreground hover:border-input',
              )}
            >
              <span className="size-1.5 rounded-full" style={{ background: colours[option] }} />
              {format(option)}
            </button>
          );
        })}
        {selected.length > 0 && (
          <button onClick={() => selected.forEach(onToggle)} className="text-[11px] text-muted-foreground hover:text-muted-foreground px-1">
            clear
          </button>
        )}
      </div>
    </div>
  );
}

const toggle = (list, value) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const dedupe = (elements) => {
  const seen = new Map();
  for (const el of elements) seen.set(el.data.id, el);
  return [...seen.values()];
};
