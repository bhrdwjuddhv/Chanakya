import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScanFace, Upload, Users } from 'lucide-react';
import { get, postForm } from '../../lib/api';
import { useAuth, can } from '../../lib/auth';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Spinner } from '../ui';
import { BiometricMatchCard } from './BiometricMatchCard';
import { useI18n } from '../../lib/i18n';

export function FaceSearchPanel({ caseId }) {
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const { t, lang } = useI18n();

  const status = useQuery({ queryKey: ['face-status'], queryFn: () => get('/biometrics/face/status') });

  const searchMutation = useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('image', file);
      if (caseId) form.append('caseId', caseId);
      return postForm('/biometrics/face/search', form);
    },
    onSuccess: (data) => setResult(data),
  });

  function onFile(file) {
    if (!file) return;
    setResult(null);
    setPreview(URL.createObjectURL(file));
    searchMutation.mutate(file);
  }

  if (status.isLoading) return <Spinner label={lang === 'hi' ? 'बायोमेट्रिक इंजन स्थिति जांची जा रही है...' : 'Checking the face engine'} />;
  if (status.error) return <ErrorState error={status.error} onRetry={status.refetch} />;

  if (!status.data.ok) {
    return (
      <Card className="p-5">
        <ScanFace className="size-6 text-muted-foreground/50" />
        <h3 className="text-sm font-semibold text-foreground mt-3">{lang === 'hi' ? 'चेहरा पहचान इंजन अनुपलब्ध' : 'Face engine unavailable'}</h3>
        <p className="text-sm text-muted-foreground mt-1.5">
          {status.data.error}
        </p>
      </Card>
    );
  }

  const enrolled = status.data.enrolled || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 text-center border-dashed border-2 hover:border-primary/40 transition-colors">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              onFile(file);
              e.target.value = '';
            }}
          />
          <ScanFace className="size-7 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-medium text-foreground mt-2">
            {lang === 'hi' ? 'संदिग्ध का चेहरा फ़ोटो यहाँ अपलोड करें' : 'Drop a probe photo to search'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            loading={searchMutation.isPending}
            onClick={() => fileRef.current?.click()}
          >
            {lang === 'hi' ? 'फ़ोटो चुनें (Choose photo)' : 'Choose a photo'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {lang === 'hi'
              ? 'InsightFace buffalo_l (512-आयामी एम्बेडिंग)। दर्ज Suspect गैलरी में कोसाइन सिमिलैरिटी १:एन मिलान।'
              : 'Searched against every enrolled suspect. The score is cosine similarity on 512-d embeddings.'}
          </p>
        </Card>
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card
          className="border-dashed border-2 p-6 text-center hover:border-primary/40 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/bmp,image/webp"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Upload className="size-6 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-medium text-foreground mt-2">Drop a probe photo, or</p>
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
            {enrolled.length
              ? `Searched 1:N against ${enrolled.length} enrolled ${enrolled.length === 1 ? 'identity' : 'identities'} using InsightFace buffalo_l.`
              : 'No identities enrolled yet — enrol a reference gallery before searching.'}
          </p>
          {searchMutation.error && (
            <p className="text-xs text-destructive mt-2">{searchMutation.error.message}</p>
          )}
        </Card>

        {searchMutation.isPending && <Spinner label="Detecting face and searching the gallery" />}

        {result && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge>{result.facesDetected} face detected</Badge>
              <Badge>threshold {result.threshold}</Badge>
              <Badge>{Math.round(result.processingMs)} ms</Badge>
              <Badge className="font-mono">{result.engine}</Badge>
            </div>

            {result.candidates.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Users}
                  title="No candidate above the threshold"
                  description={`A face was detected, but nobody in the gallery scored above ${result.threshold}. That is a real negative result, not an error.`}
                />
              </Card>
            ) : (
              <div className="space-y-2">
                <p className="label">
                  {result.candidates.length} candidate{result.candidates.length === 1 ? '' : 's'} — each needs a
                  human decision
                </p>
                {result.candidates.map((candidate) => (
                  <BiometricMatchCard
                    key={candidate.matchId}
                    kind="face"
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
            )}
          </>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader title="Enrolled gallery" description={`${enrolled.length} identities in ${status.data.collectionId}`} />
        {enrolled.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Gallery is empty"
            description="Run the seed to enrol the reference gallery, or enrol a person from their profile."
            className="py-8"
          />
        ) : (
          <ul className="divide-y divide-border/60 max-h-96 overflow-y-auto">
            {enrolled.map((person) => (
              <li key={person.personId} className="px-4 py-2.5 flex items-center gap-2">
                <ScanFace className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate">{person.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto tabular-nums shrink-0">
                  {person.sampleCount} sample{person.sampleCount === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="px-4 py-2.5 border-t border-border text-[10px] text-muted-foreground leading-snug">
          Enrolled faces are GAN-generated for this prototype. No real person is depicted. Embeddings live
          inside the InsightFace service, not in this application's database.
        </p>
      </Card>
    </div>
  );
}
