import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  RotateCw,
  Upload,
  X,
} from 'lucide-react';
import { get, post, postForm } from '../../lib/api';
import { Badge, Button, Card, EmptyState, ErrorState, Spinner } from '../ui';
import { ENTITY_COLOURS, formatBytes, formatDateTime } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

export function EvidenceTab({ caseId }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);
  const [open, setOpen] = useState(null);
  const { t, lang } = useI18n();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['evidence', caseId],
    queryFn: () => get(`/evidence/case/${caseId}`),
    // Poll while anything is still in the pipeline — real progress, not a fake bar.
    refetchInterval: (query) =>
      query.state.data?.evidence?.some((e) => ['queued', 'processing'].includes(e.processingStatus))
        ? 2000
        : false,
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caseId', caseId);
      return postForm('/evidence', formData);
    },
    onSuccess: () => {
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ['evidence', caseId] });
    },
    onError: (err) => setUploadError(err.message),
  });

  const reprocessMutation = useMutation({
    mutationFn: (id) => post(`/evidence/${id}/reprocess`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence', caseId] }),
  });

  return (
    <div className="p-6 space-y-4">
      <Card
        className="border-dashed border-2 p-6 text-center hover:border-primary/40 transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) uploadMutation.mutate(file);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.md,.csv,.log,.eml,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadMutation.mutate(file);
            e.target.value = '';
          }}
        />
        <Upload className="size-6 text-muted-foreground/50 mx-auto" />
        <p className="text-sm font-medium text-foreground mt-2">
          {lang === 'hi' ? 'साक्ष्य दस्तावेज़ यहाँ खींचें या अपलोड करें' : 'Drop a document here, or'}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          loading={uploadMutation.isPending}
          onClick={() => fileRef.current?.click()}
        >
          {lang === 'hi' ? 'फ़ाइल चुनें (Browse File)' : 'Choose a file'}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          {lang === 'hi'
            ? 'PDF, DOCX, TXT, CSV या LOG। पाठ्य सामग्री से एआई द्वारा आपराधिक इकाइयां और संबंध स्वतः निष्कर्षित कर ग्राफ़ में दर्ज किए जाते हैं।'
            : 'PDF, DOCX, TXT, CSV or LOG. Text is extracted, indexed for search, and mined for entities and relationships, which enter the graph as suggestions for review.'}
        </p>
        {uploadError && <p className="text-xs text-destructive mt-2">{uploadError}</p>}
      </Card>

      {isLoading && <Spinner label={lang === 'hi' ? 'साक्ष्य पत्रावली लोड हो रही है...' : 'Loading evidence'} />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data?.evidence.length === 0 && (
        <Card>
          <EmptyState
            icon={FileText}
            title={lang === 'hi' ? 'इस केस में अभी कोई साक्ष्य दर्ज नहीं है' : 'No evidence on this case yet'}
            description={lang === 'hi' ? 'संबंध नेटवर्क ग्राफ़ निर्माण हेतु पहली साक्ष्य फ़ाइल अपलोड करें।' : 'Upload a document to start building the relationship graph from it.'}
          />
        </Card>
      )}

      <div className="space-y-2">
        {data?.evidence.map((item) => (
          <EvidenceRow
            key={item._id}
            item={item}
            onReprocess={() => reprocessMutation.mutate(item._id)}
            onOpen={() => setOpen(item)}
          />
        ))}
      </div>

      {open && <DocumentViewer evidence={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function EvidenceRow({ item, onReprocess, onOpen }) {
  const processing = ['queued', 'processing'].includes(item.processingStatus);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <FileText className="size-4 text-muted-foreground mt-0.5 shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onOpen} className="text-sm font-medium text-foreground hover:text-primary truncate">
              {item.filename}
            </button>
            <StatusPill status={item.processingStatus} />
          </div>

          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatBytes(item.bytes)} · uploaded {formatDateTime(item.uploadedAt)}
            {item.uploadedBy?.name && ` by ${item.uploadedBy.name}`}
            {item.chunkCount ? ` · ${item.chunkCount} indexed chunks` : ''}
          </p>

          {processing && (
            <p className="flex items-center gap-1.5 text-xs text-primary mt-2">
              <Loader2 className="size-3 animate-spin" />
              {item.processingStep || 'Working…'}
            </p>
          )}

          {item.processingStatus === 'failed' && (
            <p className="flex items-start gap-1.5 text-xs text-destructive mt-2">
              <AlertCircle className="size-3.5 shrink-0 mt-px" />
              {item.processingError || 'Processing failed'}
            </p>
          )}

          {item.processingStatus === 'completed' && item.processingStep !== 'Completed' && (
            <p className="text-xs text-muted-foreground mt-2">{item.processingStep}</p>
          )}

          {item.aiSummary && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed bg-muted border border-border/60 rounded-control px-3 py-2">
              {item.aiSummary}
            </p>
          )}

          {item.extractedEntities?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.extractedEntities.slice(0, 12).map((entity, i) => (
                <Badge key={i} dot={ENTITY_COLOURS[entity.type]}>
                  {entity.name}
                </Badge>
              ))}
              {item.extractedEntities.length > 12 && (
                <Badge>+{item.extractedEntities.length - 12} more</Badge>
              )}
            </div>
          )}

          <p className="font-mono text-[10px] font-normal text-muted-foreground mt-2.5 truncate" title={item.sha256}>
            <span className="label !text-[10px] mr-1.5">sha256</span>{item.sha256}
          </p>
        </div>

        {!processing && (
          <Button variant="ghost" size="sm" onClick={onReprocess} title="Re-run the pipeline">
            <RotateCw className="size-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatusPill({ status }) {
  const map = {
    queued: { label: 'Queued', className: 'bg-muted text-muted-foreground border-border' },
    processing: { label: 'Processing', className: 'bg-primary/10 text-primary border-primary/30' },
    completed: { label: 'Processed', className: 'bg-success/12 text-success border-success/25' },
    failed: { label: 'Failed', className: 'bg-destructive/12 text-destructive border-destructive/30' },
  };
  const style = map[status] || map.queued;
  return (
    <Badge className={style.className}>
      {status === 'completed' && <CheckCircle2 className="size-3" />}
      {style.label}
    </Badge>
  );
}

/** Reads the extracted text back from the server; also used for citation highlighting. */
export function DocumentViewer({ evidence, highlight, onClose }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['evidence-text', evidence._id],
    queryFn: () => get(`/evidence/${evidence._id}/text`),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/40 p-6" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground truncate">{evidence.filename}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && <Spinner label="Loading document" />}
          {error && <ErrorState error={error} />}
          {data && (
            <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {highlight ? highlightSnippet(data.text, highlight) : data.text}
            </pre>
          )}
        </div>
      </Card>
    </div>
  );
}

function highlightSnippet(text, snippet) {
  const index = text.indexOf(snippet.slice(0, 60));
  if (index === -1) return text;
  return [
    text.slice(0, index),
    <mark key="hl" className="bg-warning/30 rounded px-0.5">
      {text.slice(index, index + snippet.length)}
    </mark>,
    text.slice(index + snippet.length),
  ];
}
