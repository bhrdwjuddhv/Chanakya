import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CircleSlash, FileText, Send, Sparkles } from 'lucide-react';
import { get, streamSSE } from '../../lib/api';
import { Badge, Button, Card, ErrorState, Spinner } from '../ui';
import { DocumentViewer } from '../case/EvidenceTab';
import { cn } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

export function AssistantTab({ caseId }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [viewing, setViewing] = useState(null);
  const conversationId = useRef(null);
  const scrollRef = useRef(null);
  const { t, lang } = useI18n();

  const SUFFICIENCY = {
    sufficient: {
      icon: CheckCircle2,
      label: lang === 'hi' ? 'केस साक्ष्यों से पूर्णतः प्रमाणित' : 'Answered from the evidence',
      className: 'bg-success/12 text-success border-success/25',
    },
    partial: {
      icon: AlertTriangle,
      label: lang === 'hi' ? 'आंशिक रूप से प्रमाणित' : 'Partially answered',
      className: 'bg-warning/12 text-warning border-warning/25',
    },
    insufficient: {
      icon: CircleSlash,
      label: lang === 'hi' ? 'उपलब्ध साक्ष्यों से प्रमाणित नहीं' : 'Not answerable from this evidence',
      className: 'bg-muted text-muted-foreground border-input',
    },
  };

  const health = useQuery({ queryKey: ['health'], queryFn: () => get('/health') });
  const suggestions = useQuery({
    queryKey: ['ai-suggestions', caseId],
    queryFn: () => get(`/ai/case/${caseId}/suggestions`),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  const aiReady = health.data?.services.ai.ok;

  async function ask(text) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setQuestion('');
    setError(null);
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '', sources: [], citations: [], pending: true },
    ]);

    const patchLast = (patch) =>
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = typeof patch === 'function' ? patch(last) : { ...last, ...patch };
        return next;
      });

    try {
      await streamSSE(
        `/ai/case/${caseId}/ask`,
        { question: trimmed, conversationId: conversationId.current || undefined },
        (event) => {
          if (event.type === 'meta') {
            conversationId.current = event.conversationId;
            patchLast({ sources: event.sources });
          } else if (event.type === 'delta') {
            patchLast((last) => ({ ...last, content: last.content + event.text, pending: false }));
          } else if (event.type === 'done') {
            patchLast({
              pending: false,
              sufficiency: event.sufficiency,
              citations: event.citations,
              relatedEntityKeys: event.relatedEntityKeys,
            });
          } else if (event.type === 'error') {
            patchLast({ pending: false, error: event.message });
          }
        },
      );
    } catch (err) {
      setError(err.message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <Intro
              aiReady={aiReady}
              suggestions={suggestions}
              onPick={ask}
              healthLoading={health.isLoading}
            />
          )}

          {messages.map((message, i) =>
            message.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-xl rounded-card rounded-br-control bg-primary px-4 py-2.5 text-[13px] text-primary-foreground shadow-glow">
                  {message.content}
                </div>
              </div>
            ) : (
              <AssistantMessage key={i} message={message} onOpenCitation={setViewing} />
            ),
          )}

          {error && <ErrorState error={{ message: error }} />}
        </div>
      </div>

      <div className="border-t border-border bg-background p-4">
        <form
          className="max-w-3xl mx-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={!aiReady || streaming}
            placeholder={
              aiReady ? 'Ask a question about this case…' : 'Assistant unavailable — no AI provider key configured'
            }
            className="h-10 flex-1 rounded-control border border-input bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:bg-muted disabled:cursor-not-allowed"
          />
          <Button type="submit" size="lg" loading={streaming} disabled={!aiReady || !question.trim()}>
            <Send className="size-3.5" />
          </Button>
        </form>
        <p className="max-w-3xl mx-auto text-[11px] text-muted-foreground mt-2">
          Answers are drawn only from evidence indexed on this case. Every citation opens the document it came
          from.
        </p>
      </div>

      {viewing && (
        <DocumentViewer
          evidence={{ _id: viewing.evidenceId, filename: viewing.sourceName }}
          highlight={viewing.snippet}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function Intro({ aiReady, suggestions, onPick, healthLoading }) {
  if (healthLoading) return <Spinner label="Checking assistant availability" />;

  if (!aiReady) {
    return (
      <Card className="p-6">
        <Sparkles className="size-6 text-muted-foreground/50" />
        <h3 className="text-sm font-semibold text-foreground mt-3">Assistant is not configured</h3>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          The case assistant answers from evidence indexed on this case, which needs an embedding and chat
          provider. Set a key in <code className="font-mono text-xs">backend/.env</code> and restart:
        </p>
        <code className="block text-[11px] font-mono bg-black text-[#DBDBDB] rounded-control px-2.5 py-1.5 mt-3">
          OPENAI_API_KEY=sk-...
        </code>
        <p className="text-xs text-muted-foreground mt-3">
          Everything else on this case — the graph, influencers, patterns, timeline and map — works without it.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Sparkles className="size-6 text-primary" />
      <h3 className="text-sm font-semibold text-foreground mt-3">Ask about this case</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
        Every answer is built from indexed evidence on this case and nothing else. Where the evidence does not
        answer a question, the assistant says so rather than filling the gap.
      </p>

      {suggestions.data?.reason && <p className="text-xs text-warning mt-3">{suggestions.data.reason}</p>}

      {suggestions.data?.questions?.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="label">Try one of these</p>
          {suggestions.data.questions.map((q) => (
            <button
              key={q}
              onClick={() => onPick(q)}
              className="block w-full text-left text-sm text-foreground rounded-control border border-border px-3 py-2 hover:border-primary/40 hover:bg-primary/10/40 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function AssistantMessage({ message, onOpenCitation }) {
  const state = SUFFICIENCY[message.sufficiency];

  return (
    <Card className="p-4">
      {message.pending && !message.content && (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary pulse-dot" />
          Retrieving evidence and drafting an answer…
        </p>
      )}

      {message.sources?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3 pb-3 border-b border-border/60">
          <span className="label">Retrieved</span>
          {message.sources.map((source) => (
            <Badge key={source.index} className="font-mono !font-normal">
              [{source.index}] {source.sourceName}
            </Badge>
          ))}
        </div>
      )}

      {message.content && (
        <div className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">
          {renderWithCitations(message.content, message.citations, onOpenCitation)}
          {message.pending && <span className="stream-caret ml-0.5" />}
        </div>
      )}

      {message.error && (
        <p className="text-xs text-destructive mt-2 flex items-start gap-1.5">
          <AlertTriangle className="size-3.5 shrink-0 mt-px" />
          {message.error}
        </p>
      )}

      {state && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/60">
          <Badge className={state.className}>
            <state.icon className="size-3" />
            {state.label}
          </Badge>
          {message.citations?.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {message.citations.length} citation{message.citations.length === 1 ? '' : 's'} · click a number to
              open the source
            </span>
          )}
        </div>
      )}

      {message.citations?.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {message.citations.map((citation) => (
            <li key={citation.index}>
              <button
                onClick={() => onOpenCitation(citation)}
                className="w-full text-left rounded-control border border-border bg-background px-3 py-2.5 transition-colors duration-150 ease-standard hover:border-primary/50"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="size-3 text-muted-foreground" />
                  <span className="font-mono text-[11px] font-normal text-primary">[{citation.index}]</span>
                  <span className="text-[12px] font-medium text-foreground truncate">{citation.sourceName}</span>
                  <span className="font-mono text-[10px] font-normal text-muted-foreground ml-auto tabular-nums shrink-0">
                    p~{citation.pageNumber} · {citation.score}
                  </span>
                </span>
                <span className="block text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                  {citation.snippet}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Turns [n] markers into clickable chips, but only where n resolves to a real citation. */
function renderWithCitations(text, citations, onOpen) {
  const byIndex = Object.fromEntries((citations || []).map((c) => [c.index, c]));

  return text.split(/(\[\d{1,2}\])/g).map((part, i) => {
    const match = part.match(/^\[(\d{1,2})\]$/);
    const citation = match && byIndex[Number(match[1])];
    if (!citation) return part;

    return (
      <button
        key={i}
        onClick={() => onOpen(citation)}
        title={`${citation.sourceName} — page ~${citation.pageNumber}`}
        className={cn(
          'inline-flex items-center justify-center align-super mx-0.5 min-w-[18px] h-[18px] px-1',
          'rounded-control border border-border bg-muted',
          'font-mono text-[10px] font-medium tabular-nums text-primary',
          'transition-colors duration-150 ease-standard hover:border-primary hover:bg-primary/10',
        )}
      >
        {citation.index}
      </button>
    );
  });
}
