import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSearch, MapPin, ShieldAlert, Upload } from 'lucide-react';
import { get, postForm } from '../../lib/api';
import { Badge, Button, Card, EmptyState, ErrorState, Spinner } from '../ui';
import { ENTITY_COLOURS, formatBytes, formatDateTime } from '../../lib/utils';

const CLASS_STYLES = {
  executable: 'bg-destructive/12 text-destructive border-destructive/30',
  archive: 'bg-warning/12 text-warning border-warning/25',
  image: 'bg-info/12 text-info border-info/25',
  document: 'bg-success/12 text-success border-success/25',
  data: 'bg-ai/12 text-ai border-ai/25',
  unknown: 'bg-muted text-muted-foreground border-border',
};

const INDICATOR_COLOURS = {
  email: ENTITY_COLOURS.Email,
  phone: ENTITY_COLOURS.Phone,
  domain: ENTITY_COLOURS.Organization,
  url: ENTITY_COLOURS.Document,
  ipv4: ENTITY_COLOURS.Vehicle,
  btc: ENTITY_COLOURS.Event,
  hash: ENTITY_COLOURS.Evidence,
  filepath: ENTITY_COLOURS.Evidence,
};

export function ForensicsTab({ caseId }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [error, setError] = useState(null);

  const { data, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ['forensics', caseId],
    queryFn: () => get(`/forensics/case/${caseId}`),
  });

  const analyseMutation = useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('file', file);
      form.append('caseId', caseId);
      return postForm('/forensics/analyse', form);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['forensics', caseId] });
      queryClient.invalidateQueries({ queryKey: ['graph', caseId] });
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="mx-auto max-w-[1200px] p-6 space-y-5">
      <Card
        className="border-dashed border-2 p-7 text-center transition-colors hover:border-primary/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) analyseMutation.mutate(file);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) analyseMutation.mutate(file);
            e.target.value = '';
          }}
        />
        <Upload className="size-6 text-muted-foreground/50 mx-auto" />
        <p className="text-[15px] font-semibold text-foreground mt-3">Drop any file for analysis</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          loading={analyseMutation.isPending}
          onClick={() => fileRef.current?.click()}
        >
          Choose a file
        </Button>
        <p className="text-[13px] text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
          Hashes it three ways, identifies the real format from its magic bytes rather than its
          extension, reads EXIF, and pulls selectors out of the content. Extracted indicators enter
          the case graph unverified.
        </p>
        {error && <p className="text-[13px] text-destructive mt-3">{error}</p>}
      </Card>

      {analyseMutation.isPending && <Spinner label="Hashing, identifying and extracting" />}
      {isLoading && <Spinner label="Loading artefacts" />}
      {loadError && <ErrorState error={loadError} onRetry={refetch} />}

      {data?.artifacts.length === 0 && !analyseMutation.isPending && (
        <Card>
          <EmptyState
            icon={FileSearch}
            title="No artefacts analysed on this case"
            description="Upload a file above to hash it and extract its indicators."
          />
        </Card>
      )}

      <div className="space-y-3">
        {data?.artifacts.map((artifact) => (
          <ArtifactCard key={artifact._id} artifact={artifact} />
        ))}
      </div>
    </div>
  );
}

function ArtifactCard({ artifact }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-semibold text-foreground">{artifact.filename}</h3>
            <Badge className={CLASS_STYLES[artifact.classification] || CLASS_STYLES.unknown}>
              {artifact.detectedType}
            </Badge>
            {artifact.extensionMismatch && (
              <Badge className="bg-primary/12 text-primary border-primary/30">
                <ShieldAlert className="size-3" /> extension mismatch
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {formatBytes(artifact.bytes)} · analysed {formatDateTime(artifact.createdAt)}
            {artifact.analysedBy?.name && ` by ${artifact.analysedBy.name}`}
          </p>
        </div>

        {artifact.entitiesAdded > 0 && (
          <Badge className="bg-info/12 text-info border-info/25">
            {artifact.entitiesAdded} entities added to graph
          </Badge>
        )}
      </div>

      {artifact.extensionMismatch && (
        <p className="text-[13px] text-primary bg-primary/10 border border-primary/25 rounded-control px-3 py-2 mt-3 leading-relaxed">
          The extension claims one format; the leading bytes say <strong>{artifact.detectedType}</strong>.
          A file disguised by renaming is a finding in itself — it does not explain itself away.
        </p>
      )}

      <div className="mt-4 space-y-1">
        <HashRow label="SHA-256" value={artifact.sha256} />
        <HashRow label="SHA-1" value={artifact.sha1} />
        <HashRow label="MD5" value={artifact.md5} />
      </div>

      {artifact.aiSummary && (
        <p className="text-[13px] text-foreground mt-4 leading-relaxed bg-muted border border-border rounded-control px-3 py-2.5">
          {artifact.aiSummary}
        </p>
      )}

      {artifact.gps?.lat != null && (
        <p className="flex items-center gap-1.5 text-[13px] text-success mt-3">
          <MapPin className="size-3.5" />
          EXIF GPS:{' '}
          <span className="font-mono font-normal">
            {artifact.gps.lat.toFixed(5)}, {artifact.gps.lng.toFixed(5)}
          </span>
        </p>
      )}

      {Object.keys(artifact.metadata || {}).length > 0 && (
        <div className="mt-4">
          <p className="label mb-2">Metadata</p>
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {Object.entries(artifact.metadata).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[12px] border-b border-border/40 py-1">
                <dt className="text-muted-foreground capitalize shrink-0">
                  {key.replace(/([A-Z])/g, ' $1')}
                </dt>
                <dd className="text-foreground text-right ml-auto font-mono font-normal break-all">
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {artifact.indicators?.length > 0 && (
        <div className="mt-4">
          <p className="label mb-2">Extracted indicators ({artifact.indicators.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {artifact.indicators.map((indicator, i) => (
              <Badge key={i} dot={INDICATOR_COLOURS[indicator.kind]} className="font-mono !font-normal">
                {indicator.value}
                {indicator.count > 1 && (
                  <span className="text-muted-foreground">×{indicator.count}</span>
                )}
              </Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2.5 leading-snug">
            An identifier appearing in a file is a fact about the file, not about a person. These
            entered the graph unverified.
          </p>
        </div>
      )}
    </Card>
  );
}

function HashRow({ label, value }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="label w-16 shrink-0">{label}</span>
      <span className="font-mono text-[12px] font-normal text-foreground break-all">{value}</span>
    </div>
  );
}
