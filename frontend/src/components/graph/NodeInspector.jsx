import { useQuery } from '@tanstack/react-query';
import { Crosshair, ExternalLink, GitBranch, Route, X } from 'lucide-react';
import { get } from '../../lib/api';
import { Badge, Button, ErrorState, Spinner } from '../ui';
import { ENTITY_COLOURS, STATUS_STYLES } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

export function NodeInspector({ nodeKey, onClose, onExpand, onFocus, onPathFrom, pathAnchor }) {
  const { t, lang } = useI18n();
  const { data, isLoading, error } = useQuery({
    queryKey: ['graph-node', nodeKey],
    queryFn: () => get(`/graph/node/${encodeURIComponent(nodeKey)}`),
    enabled: Boolean(nodeKey),
  });

  const node = data?.node;

  const getEntityTypeName = (tp) => {
    if (lang !== 'hi') return tp;
    const map = {
      Person: 'संदिग्ध व्यक्ति (Person)',
      Phone: 'फ़ोन / सिम (Phone)',
      Email: 'ईमेल पता (Email)',
      Organization: 'कंपनी / सिंडिकेट (Org)',
      Vehicle: 'वाहन (Vehicle)',
      Location: 'स्थान (Location)',
      Document: 'दस्तावेज़ (Doc)',
      Evidence: 'साक्ष्य (Evidence)',
      Event: 'कांड / घटना (Event)',
    };
    return map[tp] || tp;
  };

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
      <PanelHeader title={lang === 'hi' ? 'इकाई विवरण (Entity Inspector)' : 'Entity'} onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        {isLoading && <Spinner label={lang === 'hi' ? 'इकाई विवरण लोड हो रहा है...' : 'Loading entity'} />}
        {error && <ErrorState error={error} />}

        {node && (
          <>
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: ENTITY_COLOURS[node.type] }} />
                <span className="label">{getEntityTypeName(node.type)}</span>
              </div>
              <h4 className="text-[17px] mt-2 leading-snug">{node.name}</h4>
              {node.aliases?.length > 0 && (
                <p className="text-[12px] text-muted-foreground mt-1.5">
                  {lang === 'hi' ? 'उपनाम / उर्फ़:' : 'Also known as'} {node.aliases.join(', ')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
              <Metric label={lang === 'hi' ? 'संबंध (Links)' : 'Relationships'} value={node.relationshipCount} />
              <Metric label={lang === 'hi' ? 'संबद्ध केस (Cases)' : 'Cases'} value={node.cases.length} />
            </div>

            {node.cases.length > 0 && (
              <Section title={lang === 'hi' ? 'इन मामलों में दर्ज' : 'Appears in'}>
                <div className="space-y-1.5">
                  {node.cases.map((c) => (
                    <a
                      key={c.caseId}
                      href={`/cases/${c.caseId}`}
                      className="flex items-center justify-between gap-2 rounded-control border border-border px-2.5 py-2 transition-colors hover:border-primary/40"
                    >
                      <span className="text-[12px] text-foreground truncate">{c.title}</span>
                      <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
                {node.cases.length > 1 && (
                  <p className="text-[11px] text-warning bg-warning/10 border border-warning/25 rounded-control px-2.5 py-2 mt-2.5 leading-snug">
                    {lang === 'hi'
                      ? `यह इकाई ${node.cases.length} अलग-अलग केसों को आपस में जोड़ती है।`
                      : `This entity links ${node.cases.length} separate cases.`}
                  </p>
                )}
              </Section>
            )}

            {Object.keys(node.attributes || {}).length > 0 && (
              <Section title="Attributes">
                <dl className="space-y-2">
                  {Object.entries(node.attributes).map(([key, value]) => (
                    <div key={key} className="flex gap-3 text-[12px]">
                      <dt className="text-muted-foreground shrink-0 capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </dt>
                      <dd className="text-foreground text-right ml-auto break-words">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}
          </>
        )}
      </div>

      {node && (
        <div className="border-t border-border p-3 space-y-1.5">
          <Button variant="secondary" size="sm" className="w-full" onClick={() => onExpand(node.key)}>
            <GitBranch className="size-3.5" /> {lang === 'hi' ? 'संबंधों का विस्तार करें (Expand)' : 'Expand relationships'}
          </Button>
          <Button variant="secondary" size="sm" className="w-full" onClick={() => onFocus(node.key)}>
            <Crosshair className="size-3.5" /> {lang === 'hi' ? 'इस इकाई पर फ़ोकस करें' : 'Focus on this entity'}
          </Button>
          <Button
            variant={pathAnchor === node.key ? 'primary' : 'secondary'}
            size="sm"
            className="w-full"
            onClick={() => onPathFrom(node.key)}
          >
            <Route className="size-3.5" />
            {pathAnchor && pathAnchor !== node.key
              ? lang === 'hi'
                ? 'चयनित से मार्ग खोजें'
                : 'Find path from selected'
              : pathAnchor === node.key
                ? lang === 'hi'
                  ? 'दूसरी इकाई चुनें…'
                  : 'Pick a second entity…'
                : lang === 'hi'
                  ? 'सबसे छोटा मार्ग खोजें (Shortest Path)'
                  : 'Find shortest path'}
          </Button>
        </div>
      )}
    </aside>
  );
}

function PanelHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
      <h3 className="label">{title}</h3>
      <button
        onClick={onClose}
        aria-label="Close panel"
        className="grid size-7 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="px-5 py-3.5">
      <p className="label">{label}</p>
      <p className="font-mono text-xl font-medium text-foreground tabular-nums mt-1">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="px-5 py-4 border-b border-border">
      <p className="label mb-2.5">{title}</p>
      {children}
    </div>
  );
}

/** Shown when an edge is clicked, so a suggested link can be confirmed or rejected. */
export function EdgeInspector({ edge, onClose, onReview, reviewing, canReview }) {
  const { t, lang } = useI18n();
  const style = STATUS_STYLES[edge.status] || STATUS_STYLES.SUGGESTED;

  const getStatusHindi = (st) => {
    if (st === 'CONFIRMED') return 'अधिकारी द्वारा पुष्टीकृत (Confirmed)';
    if (st === 'SUGGESTED') return 'एआई द्वारा प्रस्तावित (Suggested)';
    if (st === 'INFERRED') return 'अनुमानित संबंध (Inferred)';
    if (st === 'DISPUTED') return 'विवादित / खंडित (Disputed)';
    return st;
  };

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
      <PanelHeader title={lang === 'hi' ? 'संबंध लिंक विवरण' : 'Relationship'} onClose={onClose} />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <Badge className={style.badge}>{lang === 'hi' ? getStatusHindi(edge.status) : style.label}</Badge>
          <h4 className="text-[17px] font-semibold text-foreground mt-2 leading-snug">{edge.type}</h4>
        </div>

        {edge.weight && (
          <div>
            <p className="label mb-1">{lang === 'hi' ? 'विश्वसनीयता / भार गुणांक' : 'Confidence / Weight'}</p>
            <p className="font-mono text-sm text-foreground tabular-nums">{(edge.weight * 100).toFixed(0)}%</p>
          </div>
        )}

        {edge.sourceEvidence && (
          <div>
            <p className="label mb-1">{lang === 'hi' ? 'मूल साक्ष्य दस्तावेज़' : 'Source evidence'}</p>
            <p className="text-xs text-muted-foreground">{edge.sourceEvidence}</p>
          </div>
        )}
      </div>

      {canReview && (
        <div className="border-t border-border p-4 flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            loading={reviewing}
            onClick={() => onReview(edge.id, 'CONFIRMED')}
          >
            {lang === 'hi' ? 'पुष्टि करें (Confirm)' : 'Confirm'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            loading={reviewing}
            onClick={() => onReview(edge.id, 'DISPUTED')}
          >
            {lang === 'hi' ? 'अस्वीकार करें' : 'Dispute'}
          </Button>
        </div>
      )}
    </aside>
  );
}
