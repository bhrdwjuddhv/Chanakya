import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Sparkles } from 'lucide-react';
import { get, patch, post, getToken } from '../../lib/api';
import { useAuth, can } from '../../lib/auth';
import { Badge, Button, Card, EmptyState, ErrorState, Select, Spinner } from '../ui';
import { formatDateTime } from '../../lib/utils';

const TYPES = [
  { value: 'case_summary', label: 'Case summary' },
  { value: 'network_analysis', label: 'Network analysis' },
  { value: 'evidence_register', label: 'Evidence register' },
];

const STATUS_STYLES = {
  draft: 'bg-warning/12 text-warning border-warning/25',
  reviewed: 'bg-info/12 text-info border-info/25',
  final: 'bg-success/12 text-success border-success/25',
};

export function ReportsTab({ caseId }) {
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const [type, setType] = useState('case_summary');
  const [openId, setOpenId] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reports', caseId],
    queryFn: () => get(`/reports/case/${caseId}`),
  });

  const generateMutation = useMutation({
    mutationFn: () => post(`/reports/case/${caseId}/generate`, { type }),
    onSuccess: ({ report }) => {
      queryClient.invalidateQueries({ queryKey: ['reports', caseId] });
      setOpenId(report._id);
    },
  });

  return (
    <div className="mx-auto max-w-[1200px] p-6 space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label block mb-2">Report type</label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <Button loading={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
            <FileText className="size-3.5" /> Generate
          </Button>
        </div>
        <p className="text-[13px] text-muted-foreground mt-3 max-w-3xl leading-relaxed">
          Assembled from the stored record — every line carries the source it came from. Recorded fact,
          evidence, computed findings and open questions are kept in separate sections, and any AI prose
          sits apart from all of them.
        </p>
        {generateMutation.error && (
          <p className="text-[13px] text-destructive mt-3">{generateMutation.error.message}</p>
        )}
      </Card>

      {generateMutation.isPending && <Spinner label="Gathering facts from the case record" />}
      {isLoading && <Spinner label="Loading reports" />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {data?.reports.length === 0 && !generateMutation.isPending && (
        <Card>
          <EmptyState
            icon={FileText}
            title="No reports generated yet"
            description="Generate one above. It draws only on what this case already holds."
          />
        </Card>
      )}

      <div className="space-y-3">
        {data?.reports.map((report) => (
          <ReportCard
            key={report._id}
            report={report}
            open={openId === report._id}
            onToggle={() => setOpenId(openId === report._id ? null : report._id)}
            canReview={can(user, 'deleteCase')}
            onReviewed={() => queryClient.invalidateQueries({ queryKey: ['reports', caseId] })}
          />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ report, open, onToggle, canReview, onReviewed }) {
  const detail = useQuery({
    queryKey: ['report', report._id],
    queryFn: () => get(`/reports/${report._id}`),
    enabled: open,
  });

  const reviewMutation = useMutation({
    mutationFn: (status) => patch(`/reports/${report._id}/review`, { status }),
    onSuccess: onReviewed,
  });

  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 surface-hover transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-semibold text-foreground">{report.title}</h3>
            <Badge className={STATUS_STYLES[report.status]}>{report.status}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            <span className="font-mono font-normal">{report.factCount}</span> facts from{' '}
            <span className="font-mono font-normal">{report.sourceCount}</span> source
            {report.sourceCount === 1 ? '' : 's'} · generated {formatDateTime(report.createdAt)}
            {report.generatedBy?.name && ` by ${report.generatedBy.name}`}
            {report.reviewedBy?.name && ` · signed off by ${report.reviewedBy.name}`}
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{open ? 'Hide' : 'Open'}</span>
      </button>

      {open && (
        <div className="border-t border-border">
          {detail.isLoading && <Spinner label="Loading report" />}
          {detail.error && <ErrorState error={detail.error} />}

          {detail.data && (
            <>
              <div className="p-5 space-y-6">
                {detail.data.report.sections.map((section) => (
                  <section key={section.key}>
                    <h4 className="label">{section.title}</h4>
                    <p className="text-[12px] text-muted-foreground mt-1 mb-3 italic">
                      {section.description}
                    </p>
                    {section.items.length === 0 ? (
                      <p className="text-[13px] text-muted-foreground">Nothing recorded.</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {section.items.map((item, i) => (
                          <li key={i} className="border-l-2 border-border pl-3">
                            <p className="text-[13px] text-foreground leading-relaxed">{item.statement}</p>
                            <p className="font-mono text-[10px] font-normal text-muted-foreground mt-1 break-all">
                              {item.source}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}

                <section>
                  <h4 className="label flex items-center gap-1.5">
                    <Sparkles className="size-3 text-ai" /> AI observations
                  </h4>
                  {detail.data.report.aiNarrative ? (
                    <>
                      <p className="text-[12px] text-muted-foreground mt-1 mb-3 italic">
                        Written by a language model over the fact set above. Not evidence.
                      </p>
                      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap bg-ai/5 border border-ai/20 rounded-control px-3.5 py-3">
                        {detail.data.report.aiNarrative}
                      </p>
                    </>
                  ) : (
                    <p className="text-[13px] text-muted-foreground mt-1">
                      Not generated ({detail.data.report.aiNarrativeStatus}). The report above is complete
                      without it.
                    </p>
                  )}
                </section>
              </div>

              <div className="flex flex-wrap items-center gap-2 px-5 py-3.5 border-t border-border">
                <Button variant="secondary" size="sm" onClick={() => downloadMarkdown(report)}>
                  <Download className="size-3.5" /> Export Markdown
                </Button>
                {canReview && report.status === 'draft' && (
                  <Button size="sm" loading={reviewMutation.isPending} onClick={() => reviewMutation.mutate('reviewed')}>
                    Sign off as reviewed
                  </Button>
                )}
                {canReview && report.status === 'reviewed' && (
                  <Button size="sm" loading={reviewMutation.isPending} onClick={() => reviewMutation.mutate('final')}>
                    Mark final
                  </Button>
                )}
                {!canReview && (
                  <span className="text-[11px] text-muted-foreground">
                    Sign-off is a supervisory action.
                  </span>
                )}
                {reviewMutation.error && (
                  <span className="text-[13px] text-destructive">{reviewMutation.error.message}</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * The export endpoint needs an Authorization header, so a plain link will not do —
 * fetch it and hand the browser a blob.
 */
async function downloadMarkdown(report) {
  const res = await fetch(`/api/reports/${report._id}/export.md`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) return;

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.title.replace(/[^\w-]+/g, '_')}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
