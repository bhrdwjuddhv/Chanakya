import { Info, Sparkles, X } from 'lucide-react';
import { ErrorState, Spinner } from '../ui';
import { COMMUNITY_PALETTE } from '../graph/RelationshipGraph';
import { ENTITY_COLOURS } from '../../lib/utils';

/**
 * Ranked key influencers from Neo4j GDS. The score is a weighted blend that leans on
 * betweenness, because the person who bridges otherwise-separate groups is usually the
 * one holding the network together — not whoever has the most contacts.
 */
export function InfluencerPanel({ query, onSelect, onClose }) {
  const { data, isLoading, error } = query;

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="label">Key influencers</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {isLoading && <Spinner label="Running centrality analysis" />}
      {error && <ErrorState error={error} />}

      {data && (
        <>
          <div className="px-4 py-2.5 border-b border-border/60 bg-muted">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {data.nodeCount} connected entities in {data.communities.length} communities. Ranked by degree,
              betweenness, PageRank and community position.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {data.influencers.length === 0 && (
              <p className="px-4 py-6 text-xs text-muted-foreground text-center">
                Not enough connected entities in this case to rank.
              </p>
            )}

            {data.influencers.map((entity) => (
              <button
                key={entity.key}
                onClick={() => onSelect(entity.key)}
                className="w-full text-left px-4 py-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sidebar font-mono text-[10px] font-medium text-white tabular-nums">
                    {entity.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full shrink-0" style={{ background: ENTITY_COLOURS[entity.type] }} />
                      <p className="text-sm font-medium text-foreground truncate">{entity.name}</p>
                    </div>

                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${entity.influenceScore * 100}%` }}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] font-normal text-muted-foreground tabular-nums">
                      <span title="Direct connections">deg {entity.scores.degree}</span>
                      <span title="How often this entity sits on the shortest path between two others">
                        btw {entity.scores.betweenness}
                      </span>
                      <span title="Influence weighted by how connected its neighbours are">
                        pr {entity.scores.pagerank}
                      </span>
                      <span
                        className="inline-flex items-center gap-1"
                        title={`Louvain community ${entity.communityId}`}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: COMMUNITY_PALETTE[entity.communityId % COMMUNITY_PALETTE.length] }}
                        />
                        group of {entity.communitySize}
                      </span>
                    </div>

                    <ul className="mt-2 space-y-1">
                      {entity.reasons.map((reason, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground leading-snug flex gap-1.5">
                          <span className="text-muted-foreground/50 mt-px">—</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="flex gap-1.5 px-4 py-2.5 border-t border-border text-[10px] text-muted-foreground leading-snug">
            <Info className="size-3 shrink-0 mt-px" />
            Centrality describes position in this graph only. It is not evidence of guilt, and it reflects
            what has been recorded so far.
          </p>
        </>
      )}
    </aside>
  );
}
