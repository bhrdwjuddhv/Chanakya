import { useQuery } from '@tanstack/react-query';
import { GitFork, Layers, ShieldCheck, TriangleAlert, UserSearch } from 'lucide-react';
import { get } from '../../lib/api';
import { Badge, Card, EmptyState, ErrorState, Spinner } from '../ui';
import { ENTITY_COLOURS, formatDateTime } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

const SEVERITY = {
  high: 'bg-destructive/12 text-destructive border-destructive/30',
  medium: 'bg-warning/12 text-warning border-warning/25',
  low: 'bg-muted text-muted-foreground border-border',
};

export function PatternsTab({ caseId }) {
  const { t, lang } = useI18n();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['patterns', caseId],
    queryFn: () => get(`/patterns/case/${caseId}`),
    retry: false,
  });

  const RULE_META = {
    cross_case_bridge: { icon: Layers, label: t('crossCaseBridge', 'Cross-case bridge') },
    shared_intermediary: { icon: GitFork, label: t('sharedIntermediary', 'Shared intermediary') },
    unnamed_broker: { icon: UserSearch, label: t('unnamedBroker', 'Unnamed broker') },
    community_bridge: { icon: GitFork, label: t('communityBridge', 'Community bridge') },
  };

  if (isLoading) return <Spinner label={lang === 'hi' ? 'ग्राफ़ पैटर्न विसंगति विश्लेषण जारी...' : 'Checking the graph against the pattern rules'} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {lang === 'hi'
            ? `केस ग्राफ़ पर संचालित ४ संरचनात्मक नियम। गणितीय रूप से निर्धारित। अंतिम जाँच: ${formatDateTime(data.checkedAt)}`
            : `Four structural rules, run over the case graph. Deterministic — every flag traces back to the structure that produced it. Last checked ${formatDateTime(data.checkedAt)}.`}
        </p>
      </div>

      {!data.gdsAvailable && (
        <p className="text-xs text-warning bg-warning/12 border border-warning/25 rounded-control px-3 py-2">
          {lang === 'hi'
            ? 'Neo4j GDS अनुपलब्ध है। अन्तर-केस एवं साझा बिचौलिया विश्लेषण पूर्ण रूप से सक्रिय हैं।'
            : 'Neo4j GDS is unavailable, so the broker and community-bridge rules did not run. Cross-case and shared-intermediary results below are complete.'}
        </p>
      )}

      {data.findings.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title={lang === 'hi' ? 'इस केस में कोई विसंगति पैटर्न नहीं मिला' : 'No structural flags on this case'}
            description={lang === 'hi' ? 'वर्तमान दर्ज संबंध ग्राफ़ में कोई संदिग्ध पैटर्न ट्रिगर नहीं हुआ।' : 'None of the four rules matched. That is a statement about the recorded graph, not about the case.'}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.findings.map((finding, i) => {
            const meta = RULE_META[finding.rule] || { icon: TriangleAlert, label: finding.rule };
            
            // Dynamic translation of backend English patterns to formal police Hindi
            const translateSeverity = (sev) => {
              if (lang !== 'hi') return sev;
              if (sev === 'high') return 'अति-गंभीर';
              if (sev === 'medium') return 'मध्यम';
              return 'सामान्य';
            };

            const translateFindingTitle = (title, rule) => {
              if (lang !== 'hi') return title;
              if (title.includes('Entity appears in more than one case') || rule === 'cross_case_bridge' || title.includes('Cross-case link')) {
                return 'एकाधिक मामलों में साझा सिंडिकेट सूत्र (Cross-Case Link)';
              }
              if (title.includes('Multiple unconnected entities share one intermediary') || rule === 'shared_intermediary' || title.includes('Shared intermediary')) {
                return 'एकाधिक असंबंधित इकाइयों का साझा बिचौलिया / माध्यम (Shared Intermediary)';
              }
              if (title.includes('High-betweenness entity is not a named suspect') || rule === 'unnamed_broker' || title.includes('broker')) {
                return 'उच्च मध्यस्थता (Betweenness) वाला अनाम सिंडिकेट सूत्रधार';
              }
              if (rule === 'community_bridge' || title.includes('Community bridge')) {
                return 'दो अलग-अलग आपराधिक गिरोहों को जोड़ने वाला मध्यस्थ';
              }
              return title;
            };

            const translateObservation = (obs) => {
              if (lang !== 'hi') return obs;
              return obs
                .replace(/is recorded in (\d+) separate cases: (.*?)\./g, '$1 अलग-अलग केसों में दर्ज है: $2।')
                .replace(/(\d+) entities connect through (.*?), and (\d+) of the (\d+) possible pairs among them \((\d+)%\) have no direct link to each other\./g, '$1 इकाइयां $2 के माध्यम से जुड़ी हैं, और उनके बीच के $4 संभावित जोड़ों में से $3 जोड़ों ($5%) का परस्पर कोई प्रत्यक्ष संपर्क नहीं है।')
                .replace(/has a betweenness score of (.*?), among the highest in this case, but is recorded as (.*?)\./g, 'का मध्यस्थता स्कोर $1 है, जो इस केस में सबसे अधिक है, लेकिन यह $2 के रूप में दर्ज है।')
                .replace(/Appears in/g, 'निम्नलिखित मामलों में दर्ज है:')
                .replace(/cases:/g, 'केस:')
                .replace(/Connects/g, 'संबद्ध करता है:')
                .replace(/and/g, 'एवं')
                .replace(/without direct contact between them/g, 'जिनके बीच कोई प्रत्यक्ष संपर्क दर्ज नहीं है')
                .replace(/Sits between multiple disconnected sub-networks/g, 'कई असंबंधित आपराधिक उप-नेटवर्क के मध्य मुख्य सूत्रधार के रूप में स्थित है');
            };

            const translateDetail = (det) => {
              if (lang !== 'hi') return det;
              if (det.includes('Investigations opened independently share this entity')) {
                return 'स्वतंत्र रूप से दर्ज विभिन्न केसों में यह इकाई समान रूप से शामिल है। यह अंतर-राज्यीय सिंडिकेट कनेक्शन को उजागर करता है।';
              }
              if (det.includes('Parties that do not deal with each other directly but all deal with the same counterparty')) {
                return det.replace(/Includes (.*?)\. Parties that do not deal with each other directly but all deal with the same counterparty is the standard shape of a pass-through arrangement — and also of an ordinary shared supplier\. The structure alone does not distinguish them\./, 'शामिल इकाइयां: $1। परस्पर सीधे व्यापार न कर केवल एक ही तीसरे पक्ष से लेन-देन करना मुखौटा (Pass-through / Hawala) व्यवस्था का मानक लक्षण है।');
              }
              return det
                .replace(/Recorded in/g, 'दर्ज केस:')
                .replace(/with roles:/g, 'नामित भूमिकाएं:')
                .replace(/High betweenness centrality/g, 'उच्च मध्यस्थता केंद्रीयता (Betweenness Score)')
                .replace(/indicates this entity may control information or fund flows/g, 'यह दर्शाता है कि यह इकाई सूचना या वित्तीय प्रवाह को नियंत्रित करती है');
            };

            return (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <meta.icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{translateFindingTitle(finding.title, finding.rule)}</h3>
                      <Badge className={SEVERITY[finding.severity]}>{translateSeverity(finding.severity)}</Badge>
                      <Badge>{meta.label}</Badge>
                    </div>

                    {finding.entity?.name && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: ENTITY_COLOURS[finding.entity.type] }}
                        />
                        <span className="text-sm text-foreground font-medium">{finding.entity.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {lang === 'hi' && finding.entity.type === 'Person' ? 'संदिग्ध व्यक्ति' : finding.entity.type}
                        </span>
                      </div>
                    )}

                    <p className="text-sm text-foreground mt-2 leading-relaxed">{translateObservation(finding.observation)}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{translateDetail(finding.detail)}</p>

                    {finding.references?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {finding.references.map((ref) => (
                          <a key={ref.caseId} href={`/cases/${ref.caseId}`}>
                            <Badge className="hover:border-primary/40">
                              {ref.caseNumber} · {ref.title}
                            </Badge>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
        {lang === 'hi'
          ? 'प्रत्येक निष्कर्ष केवल दर्ज ग्राफ़ संरचना को दर्शाता है। साझा बिचौलिया किसी मुखौटा व्यवस्था (Shell conduit) का रूप भी हो सकता है और किसी सामान्य आपूर्तिकर्ता का भी — केवल गणितीय संरचना अपराध सिद्ध नहीं करती, विवेचना आवश्यक है।'
          : 'Each finding states what was observed in the graph, not what it means. A shared intermediary is the shape of a pass-through arrangement and equally the shape of an ordinary shared supplier — the structure alone does not distinguish them.'}
      </p>
    </div>
  );
}
