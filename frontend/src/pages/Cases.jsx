import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Plus, Search, X } from 'lucide-react';
import { get, post } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { PRIORITY_STYLES, formatDate } from '../lib/utils';

export function Cases() {
  const { t } = useI18n();
  const [filters, setFilters] = useState({ q: '', status: '', priority: '' });
  const [creating, setCreating] = useState(false);

  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cases', filters],
    queryFn: () => get(`/cases${params ? `?${params}` : ''}`),
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        eyebrow={t('workspace', 'Workspace')}
        title={t('allCases', 'Cases')}
        description={t('casesSubtitle', 'Every investigation on this instance.')}
        actions={
          <Button size="md" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> {t('newCase', 'New case')}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <div className="relative flex-1 min-w-56 max-w-sm">
            <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder={t('searchCases', 'Search title or case number')}
              className="pl-8"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </div>
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">{t('status', 'Status')}: All</option>
            {['open', 'active', 'pending_review', 'closed', 'cold'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
          <Select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">Any priority</option>
            {['critical', 'high', 'medium', 'low'].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-[1200px] p-6">
        {isLoading && <Spinner label="Loading cases" />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {data?.cases.length === 0 && (
          <Card>
            <EmptyState
              icon={FolderOpen}
              title="No cases match these filters"
              description="Clear the filters, or create a new case."
              action={
                <Button variant="secondary" size="sm" onClick={() => setFilters({ q: '', status: '', priority: '' })}>
                  Clear filters
                </Button>
              }
            />
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.cases.map((c) => (
            <Link key={c._id} to={`/cases/${c._id}`} className="group">
              <Card className="p-5 h-full transition-colors duration-150 ease-standard group-hover:border-primary/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-normal text-muted-foreground">{c.caseNumber}</span>
                  <Badge className={PRIORITY_STYLES[c.priority]}>{c.priority}</Badge>
                </div>
                <h3 className="text-[15px] mt-2.5">{c.title}</h3>
                <p className="text-[13px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{c.description}</p>
                <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-border/60 text-[11px] text-muted-foreground">
                  <span className="capitalize">{c.status.replace('_', ' ')}</span>
                  <span className="size-1 rounded-full bg-muted-foreground/40" />
                  <span className="font-mono font-normal">{c.evidenceCount}</span>
                  <span>evidence</span>
                  <span className="ml-auto font-mono font-normal">{formatDate(c.updatedAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {creating && <NewCaseDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewCaseDialog({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', classification: 'restricted' });

  const mutation = useMutation({
    mutationFn: (body) => post('/cases', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="label">New case</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 place-items-center rounded-control text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <div>
            <label className="label block mb-2">Title</label>
            <Input
              required
              minLength={3}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Operation …"
            />
          </div>
          <div>
            <label className="label block mb-2">Description</label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label block mb-2">Priority</label>
              <Select
                className="w-full"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {['critical', 'high', 'medium', 'low'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="label block mb-2">Classification</label>
              <Select
                className="w-full"
                value={form.classification}
                onChange={(e) => setForm({ ...form, classification: e.target.value })}
              >
                {['unclassified', 'restricted', 'confidential', 'secret'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>

          {mutation.error && <p className="text-[13px] text-destructive">{mutation.error.message}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create case
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
