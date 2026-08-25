import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fingerprint, Upload } from 'lucide-react';
import { get, postForm } from '../../lib/api';
import { useAuth, can } from '../../lib/auth';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Spinner } from '../ui';
import { BiometricMatchCard } from './BiometricMatchCard';

export function FingerprintSearchPanel({ caseId }) {
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);

  const status = useQuery({
    queryKey: ['fingerprint-status'],
    queryFn: () => get('/biometrics/fingerprint/status'),
  });

  const searchMutation = useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('image', file);
      if (caseId) form.append('caseId', caseId);
      return postForm('/biometrics/fingerprint/search', form);
    },
    onSuccess: setResult,
  });

  if (status.isLoading) return <Spinner label="Checking the AFIS engine" />;
  if (status.error) return <ErrorState error={status.error} onRetry={status.refetch} />;

  if (!status.data.ok) {
    return (
      <Card className="p-5 max-w-2xl">
        <Fingerprint className="size-6 text-muted-foreground/50" />
        <h3 className="text-sm font-semibold text-foreground mt-3">AFIS engine unavailable</h3>
        <p className="text-sm text-muted-foreground mt-1.5">
          Matching is disabled rather than faked. Reported: {status.data.error}
        </p>
        <code className="block text-[11px] font-mono bg-black text-[#DBDBDB] rounded-control px-2.5 py-1.5 mt-3">
          docker compose --profile biometrics up -d afis
        </code>
      </Card>
    );
  }

  const enrolled = status.data.enrolled || [];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        {enrolled.length === 0 && (
          <Card className="p-5 border-warning/25 bg-warning/10">
            <h3 className="text-sm font-semibold text-foreground">No fingerprints enrolled</h3>
            <p className="text-sm text-foreground mt-1.5 leading-relaxed">
              The SourceAFIS engine is running and extracting real minutiae, but the reference gallery is
              empty, so there is nothing to search against. Drop a real dataset — SOCOFing or NIST SD302 —
              into the gallery directory and re-run the seed:
            </p>
            <code className="block text-[11px] font-mono bg-black text-[#DBDBDB] rounded-control px-2.5 py-1.5 mt-3 overflow-x-auto">
              backend/src/seed/reference-galleries/fingerprints/gallery/&lt;person-slug&gt;/&lt;finger&gt;.png
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Synthetic ridge images are deliberately not enrolled — they produce false matches and would
              misrepresent what this engine can do.
            </p>
          </Card>
        )}

        <Card
          className="border-dashed border-2 p-6 text-center hover:border-primary/40 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
              setResult(null);
              setPreview(URL.createObjectURL(file));
              searchMutation.mutate(file);
            }
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/bmp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setResult(null);
                setPreview(URL.createObjectURL(file));
                searchMutation.mutate(file);
              }
              e.target.value = '';
            }}
          />
          <Upload className="size-6 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-medium text-foreground mt-2">Drop a probe print, or</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            loading={searchMutation.isPending}
            disabled={!enrolled.length}
            onClick={() => fileRef.current?.click()}
          >
            Choose an image
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Minutiae are extracted by SourceAFIS and scored against {enrolled.length} enrolled template
            {enrolled.length === 1 ? '' : 's'}.
          </p>
          {searchMutation.error && (
            <p className="text-xs text-destructive mt-2">{searchMutation.error.message}</p>
          )}
        </Card>

        {searchMutation.isPending && <Spinner label="Extracting minutiae and matching" />}

        {result && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge>{result.probeMinutiae} minutiae in probe</Badge>
              <Badge>gallery of {result.gallerySize}</Badge>
              <Badge>threshold {result.threshold}</Badge>
              <Badge className="font-mono">{result.engine}</Badge>
            </div>

            {!result.candidates.some((c) => c.aboveThreshold) && (
              <p className="text-xs text-muted-foreground bg-muted border border-border rounded-control px-3 py-2 leading-relaxed">
                No candidate reached the {result.threshold} threshold. SourceAFIS scores are log-scale, and
                its published guidance puts ~40 at a 1-in-10,000 false match rate. Every candidate is still
                listed below with its real score — a negative result is a result.
              </p>
            )}

            <div className="space-y-2">
              {result.candidates.map((candidate) => (
                <BiometricMatchCard
                  key={candidate.matchId}
                  kind="fingerprint"
                  candidate={candidate}
                  probeImageUrl={preview || result.probeImageUrl}
                  canReview={can(user, 'reviewBiometrics')}
                  onReviewed={() => {
                    queryClient.invalidateQueries({ queryKey: ['graph'] });
                    queryClient.invalidateQueries({ queryKey: ['case'] });
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader title="Enrolled templates" description={`${enrolled.length} on file`} />
        {enrolled.length === 0 ? (
          <EmptyState icon={Fingerprint} title="Gallery is empty" className="py-8" />
        ) : (
          <ul className="divide-y divide-border/60 max-h-96 overflow-y-auto">
            {enrolled.map((row) => (
              <li key={row.templateId} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Fingerprint className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate">{row.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto tabular-nums shrink-0">
                    {row.minutiae} min.
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground ml-5.5">{row.finger}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="px-4 py-2.5 border-t border-border text-[10px] text-muted-foreground leading-snug">
          Templates are AES-256-GCM encrypted at rest and never leave the server. Raw probe images are kept
          only as a record of what was searched.
        </p>
      </Card>
    </div>
  );
}
