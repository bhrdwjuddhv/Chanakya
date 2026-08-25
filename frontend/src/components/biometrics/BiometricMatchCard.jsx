import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, CircleHelp, Link2, X } from 'lucide-react';
import { post } from '../../lib/api';
import { Badge, Button, Card } from '../ui';
import { cn } from '../../lib/utils';

const REVIEWED = {
  confirmed: { label: 'Confirmed by you', className: 'bg-success/12 text-success border-success/25' },
  rejected: { label: 'Rejected', className: 'bg-destructive/12 text-destructive border-destructive/30' },
  uncertain: { label: 'Marked uncertain', className: 'bg-warning/12 text-warning border-warning/25' },
};

/**
 * One real candidate from the matcher. The score shown is exactly what the engine
 * returned — it is deliberately never converted into a percentage confidence or a
 * "match/no match" verdict, because that decision belongs to the reviewer.
 */
export function BiometricMatchCard({ kind, candidate, probeImageUrl, canReview, onReviewed }) {
  const [status, setStatus] = useState(candidate.reviewStatus || 'pending');
  const [note, setNote] = useState('');

  const reviewMutation = useMutation({
    mutationFn: (nextStatus) =>
      post(`/biometrics/${kind}/review`, { matchId: candidate.matchId, status: nextStatus, note: note || undefined }),
    onSuccess: (data, nextStatus) => {
      setStatus(nextStatus);
      onReviewed?.(data);
    },
  });

  const reviewed = REVIEWED[status];

  return (
    <Card className={cn('p-4', status === 'confirmed' && 'border-success/25')}>
      <div className="flex items-start gap-4">
        {probeImageUrl && (
          <img
            src={probeImageUrl}
            alt="Probe"
            className="size-20 rounded-control object-cover border border-border shrink-0"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-sidebar text-[10px] font-semibold text-white tabular-nums">
              {candidate.rank}
            </span>
            <span className="text-sm font-semibold text-foreground">{candidate.person.name}</span>
            {candidate.person.role && (
              <Badge className="capitalize">{candidate.person.role.replace('_', ' ')}</Badge>
            )}
            {reviewed && <Badge className={reviewed.className}>{reviewed.label}</Badge>}
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-48">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(candidate.score, 1) * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono tabular-nums text-foreground">{candidate.score.toFixed(4)}</span>
            <span className="text-[11px] text-muted-foreground">
              {kind === 'face' ? 'cosine similarity' : 'AFIS match score'}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
            A similarity score is not an identification. Confirming records that you, a named reviewer, judged
            this to be the same person — and writes a verified link into the case graph.
          </p>

          {status === 'pending' && canReview && (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note — what did you compare against?"
                className="mt-3 h-8 w-full rounded-control border border-input px-2.5 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Button size="sm" loading={reviewMutation.isPending} onClick={() => reviewMutation.mutate('confirmed')}>
                  <Check className="size-3.5" /> Confirm
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate('rejected')}
                >
                  <X className="size-3.5" /> Reject
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate('uncertain')}
                >
                  <CircleHelp className="size-3.5" /> Uncertain
                </Button>
              </div>
            </>
          )}

          {status === 'pending' && !canReview && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Your role cannot review biometric matches. A forensic examiner or supervisor must decide.
            </p>
          )}

          {status === 'confirmed' && (
            <p className="flex items-center gap-1.5 text-[11px] text-success mt-2">
              <Link2 className="size-3" />
              A confirmed MATCHED_BY link now appears in the case graph, attributed to you.
            </p>
          )}

          {reviewMutation.error && (
            <p className="text-xs text-destructive mt-2">{reviewMutation.error.message}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
