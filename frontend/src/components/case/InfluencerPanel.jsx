import { Info, Sparkles, X } from 'lucide-react';
import { ErrorState, Spinner } from '../ui';
import { COMMUNITY_PALETTE } from '../graph/RelationshipGraph';
import { ENTITY_COLOURS } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

/**
 * Ranked key influencers from Neo4j GDS. The score is a weighted blend that leans on
 * betweenness, because the person who bridges otherwise-separate groups is usually the
 * one holding the network together — not whoever has the most contacts.
 */
export function InfluencerPanel({ query, onSelect, onClose }) {
  const { data, isLoading, error } = query;
  const { t, lang } = useI18n();

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="label">{t('influencers', 'Key influencers')}</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {isLoading && <Spinner label={lang === 'hi' ? 'केंद्रीयता व सूत्रधार गणना जारी...' : 'Running centrality analysis'} />}
      {error && <ErrorState error={error} />}

      {data && (
        <>
          <div className="px-4 py-2.5 border-b border-border/60 bg-muted">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {lang === 'hi'
                ? `${data.nodeCount} सम्बद्ध इकाइयां, ${data.communities.length} सिंडिकेट समुदाय। मध्यस्थता (Betweenness), पेजरैंक और क्लस्टर स्थिति पर आधारित रैंकिंग।`
                : `${data.nodeCount} connected entities in ${data.communities.length} communities. Ranked by degree, betweenness, PageRank and community position.`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {data.influencers.length === 0 && (
              <p className="px-4 py-6 text-xs text-muted-foreground text-center">
                {lang === 'hi' ? 'रैंकिंग हेतु पर्याप्त संबंध उपलब्ध नहीं हैं।' : 'Not enough connected entities in this case to rank.'}
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
                      <span title={lang === 'hi' ? 'सीधे संपर्क संबंध' : 'Direct connections'}>
                        {lang === 'hi' ? 'डिग्री' : 'deg'} {entity.scores.degree}
                      </span>
                      <span title={lang === 'hi' ? 'यह इकाई कितनी बार किन्हीं दो अन्य लोगों के बीच सबसे छोटे मार्ग (Shortest Path) पर आती है' : 'How often this entity sits on the shortest path between two others'}>
                        {lang === 'hi' ? 'मध्यस्थता' : 'btw'} {entity.scores.betweenness}
                      </span>
                      <span title={lang === 'hi' ? 'नेटवर्क प्रभाव (पेजरैंक स्कोर)' : 'Influence weighted by how connected its neighbours are'}>
                        {lang === 'hi' ? 'पेजरैंक' : 'pr'} {entity.scores.pagerank}
                      </span>
                      <span
                        className="inline-flex items-center gap-1"
                        title={lang === 'hi' ? `सिंडिकेट समुदाय (Louvain Group) ${entity.communityId}` : `Louvain community ${entity.communityId}`}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: COMMUNITY_PALETTE[entity.communityId % COMMUNITY_PALETTE.length] }}
                        />
                        {lang === 'hi' ? `${entity.communitySize} का सिंडिकेट समूह` : `group of ${entity.communitySize}`}
                      </span>
                    </div>

                    <ul className="mt-2 space-y-1">
                      {entity.reasons.map((reason, i) => {
                        const translateReason = (r) => {
                          if (lang !== 'hi') return r;
                          if (r.includes('the widest reach in this case')) {
                            return r.replace(/Directly connected to (\d+) other entities — the widest reach in this case\./, '$1 अन्य आपराधिक इकाइयों से सीधा संपर्क — इस केस में सबसे व्यापक दायरा।');
                          }
                          if (r.includes('Connected to') && r.includes('other entities.')) {
                            return r.replace(/Connected to (\d+) other entities\./, '$1 अन्य इकाइयों से प्रत्यक्ष संपर्क।');
                          }
                          if (r.includes('Sits on most of the shortest paths')) {
                            return 'अधिकांश सबसे छोटे मार्गों (Shortest Paths) पर स्थित — सूचना एवं धन का प्रवाह यहीं से गुजरता है। यह मुख्य सिंडिकेट ब्रोकर/बिचौलिया है, मूकदर्शक नहीं।';
                          }
                          if (r.includes('Bridges groups that are otherwise weakly connected')) {
                            return 'परस्पर कम जुड़े आपराधिक गिरोहों के बीच मुख्य संपर्क पुल (Bridge) के रूप में कार्य करता है।';
                          }
                          if (r.includes('Connected to other highly connected entities')) {
                            return 'अन्य उच्च-सक्रिय प्रमुख आपराधिक इकाइयों से गहराई से जुड़ा हुआ है।';
                          }
                          if (r.includes('Belongs to a cluster of')) {
                            return r.replace(/Belongs to a cluster of (\d+) entities \((\d+)% of the network\)\./, '$1 इकाइयों के सिंडिकेट क्लस्टर का सदस्य (कुल नेटवर्क का $2%)।');
                          }
                          if (r.includes('Peripheral in this network')) {
                            return 'इस नेटवर्क में परिधीय स्थिति — बहुत कम संपर्क और कोई मुख्य मध्यस्थ भूमिका नहीं।';
                          }
                          return r;
                        };

                        return (
                          <li key={i} className="text-[11px] text-muted-foreground leading-snug flex gap-1.5">
                            <span className="text-muted-foreground/50 mt-px">—</span>
                            {translateReason(reason)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="flex gap-1.5 px-4 py-2.5 border-t border-border text-[10px] text-muted-foreground leading-snug">
            <Info className="size-3 shrink-0 mt-px" />
            {lang === 'hi'
              ? 'केंद्रीयता (Centrality) केवल संबंध ग्राफ़ में स्थिति दर्शाती है। यह दोष का प्रमाण नहीं है, बल्कि दर्ज साक्ष्यों पर आधारित नेटवर्क विश्लेषण है।'
              : 'Centrality describes position in this graph only. It is not evidence of guilt, and it reflects what has been recorded so far.'}
          </p>
        </>
      )}
    </aside>
  );
}
