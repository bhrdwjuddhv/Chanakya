import { AiConversation, AiMessage } from './conversation.model.js';
import { embed, chatStream, aiEnabled, AiUnavailableError } from '../../lib/ai/provider.js';
import { searchPoints } from '../../lib/qdrant.js';
import { run } from '../../lib/neo4j.js';
import { Evidence } from '../evidence/evidence.model.js';
import { Case } from '../cases/case.model.js';
import { HttpError } from '../../middleware/error.js';
import { logger } from '../../lib/logger.js';

const SYSTEM = `You are an assistant to a criminal investigator. You answer strictly from the numbered SOURCES provided.

Absolute rules:
- Use only what the sources say. If they do not answer the question, say so plainly.
- Never introduce a name, date, place, amount or connection that is not in the sources.
- Cite with bracketed numbers matching the source numbers, e.g. [2]. Cite the specific
  source for each claim, at the point you make it.
- Distinguish what a document states from what it merely suggests. If a source is itself
  hedged ("has not been established", "not corroborated"), carry that hedge into your answer.
- Do not speculate about guilt, motive or outcome. Report what the record contains.
- Be concise. Investigators read a lot; three tight paragraphs beat ten loose ones.

Your first line must be exactly one of:
SUFFICIENCY: sufficient
SUFFICIENCY: partial
SUFFICIENCY: insufficient

"sufficient" — the sources fully answer the question.
"partial" — they answer some of it; say which part is missing.
"insufficient" — they do not answer it. Say what is missing and stop. Do not answer anyway.

Then a blank line, then the answer.`;

/**
 * Retrieve → rerank → answer, streamed. Everything the model can cite is retrieved first,
 * so a citation index can only ever point at a real chunk.
 */
export async function* answerQuestion({ caseId, question, userId, conversationId }) {
  if (!aiEnabled) throw new AiUnavailableError();

  const caseDoc = await Case.findById(caseId).lean();
  if (!caseDoc) throw new HttpError(404, 'Case not found');

  const sources = await retrieve({ caseId, question });

  if (!sources.length) {
    const message =
      'No indexed evidence on this case matches that question. Upload and process documents first, or rephrase.';
    yield { type: 'meta', sources: [], conversationId };
    yield { type: 'delta', text: message };
    yield { type: 'done', sufficiency: 'insufficient', citations: [], relatedEntityKeys: [] };
    return;
  }

  const conversation = await getOrCreateConversation({ conversationId, caseId, userId, question });
  yield { type: 'meta', sources: sources.map(toPublicSource), conversationId: String(conversation._id) };

  const prompt = [
    `CASE: ${caseDoc.caseNumber} — ${caseDoc.title}`,
    '',
    'SOURCES:',
    ...sources.map((s, i) => `[${i + 1}] ${s.sourceName} (page ~${s.pageNumber})\n${s.content}`),
    '',
    `QUESTION: ${question}`,
  ].join('\n');

  let answer = '';
  let sufficiency = null;
  let headerDone = false;

  for await (const delta of chatStream({ system: SYSTEM, user: prompt, maxTokens: 1200 })) {
    answer += delta;

    // Hold the stream back until the SUFFICIENCY header is complete, then emit the rest.
    if (!headerDone) {
      const match = answer.match(/^SUFFICIENCY:\s*(sufficient|partial|insufficient)\s*\n+/i);
      if (match) {
        headerDone = true;
        sufficiency = match[1].toLowerCase();
        const remainder = answer.slice(match[0].length);
        if (remainder) yield { type: 'delta', text: remainder };
      } else if (answer.length > 80) {
        // Model ignored the header format — stop withholding and take what we have.
        headerDone = true;
        yield { type: 'delta', text: answer };
      }
      continue;
    }

    yield { type: 'delta', text: delta };
  }

  const body = sufficiency ? answer.replace(/^SUFFICIENCY:[^\n]*\n+/i, '') : answer;
  const citations = citationsFrom(body, sources);
  const relatedEntityKeys = await linkEntities(caseId, body);

  await AiMessage.create([
    { conversationId: conversation._id, role: 'user', content: question },
    {
      conversationId: conversation._id,
      role: 'assistant',
      content: body,
      citations,
      sufficiency: sufficiency || 'partial',
      relatedEntityKeys,
    },
  ]);
  await AiConversation.updateOne({ _id: conversation._id }, { lastMessageAt: new Date() });

  yield { type: 'done', sufficiency: sufficiency || 'partial', citations, relatedEntityKeys };
}

/** Vector search, case-scoped, then a lexical rerank over the top of it. */
async function retrieve({ caseId, question, take = 6 }) {
  const [vector] = await embed([question]);
  const hits = await searchPoints({ vector, caseId, limit: 16 });

  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((t) => t.length > 3);

  // ponytail: lexical overlap on top of the cosine score instead of a cross-encoder.
  // Names and case numbers are exactly what a vector model blurs; this recovers them.
  const reranked = hits
    .map((hit) => {
      const text = hit.payload.content.toLowerCase();
      const overlap = terms.length ? terms.filter((t) => text.includes(t)).length / terms.length : 0;
      return { ...hit.payload, score: hit.score, rerankScore: hit.score * 0.75 + overlap * 0.25 };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore);

  // One chunk per source at most twice — six chunks of the same document is not context.
  const perSource = {};
  return reranked
    .filter((chunk) => {
      perSource[chunk.evidenceId] = (perSource[chunk.evidenceId] || 0) + 1;
      return perSource[chunk.evidenceId] <= 2;
    })
    .slice(0, take);
}

/**
 * Citations come from the markers the model actually wrote, resolved against the sources we
 * retrieved. An out-of-range marker is dropped rather than invented.
 */
function citationsFrom(answer, sources) {
  const used = new Set();
  for (const match of answer.matchAll(/\[(\d{1,2})\]/g)) {
    const index = Number(match[1]);
    if (index >= 1 && index <= sources.length) used.add(index);
  }

  return [...used]
    .sort((a, b) => a - b)
    .map((index) => {
      const source = sources[index - 1];
      return {
        index,
        evidenceId: source.evidenceId,
        sourceName: source.sourceName,
        pageNumber: source.pageNumber,
        chunkId: source.chunkId,
        snippet: source.content.slice(0, 320),
        score: Math.round(source.score * 1000) / 1000,
      };
    });
}

/** Graph entities named in the answer, so the UI can jump from prose to the network. */
async function linkEntities(caseId, answer) {
  try {
    const rows = await run(
      `MATCH (n:Entity)-[:PART_OF_CASE]->(:Case {caseId: $caseId}) RETURN n.key AS key, n.name AS name`,
      { caseId: String(caseId) },
    );
    const lower = answer.toLowerCase();
    return rows.filter((r) => r.name && lower.includes(r.name.toLowerCase())).map((r) => r.key);
  } catch (err) {
    logger.warn(`entity linking skipped: ${err.message}`);
    return [];
  }
}

const toPublicSource = (source, i) => ({
  index: i + 1,
  evidenceId: source.evidenceId,
  sourceName: source.sourceName,
  pageNumber: source.pageNumber,
  score: Math.round(source.score * 1000) / 1000,
});

async function getOrCreateConversation({ conversationId, caseId, userId, question }) {
  if (conversationId) {
    const existing = await AiConversation.findById(conversationId);
    if (existing) return existing;
  }
  return AiConversation.create({
    caseId,
    userId,
    title: question.slice(0, 80),
  });
}

export const listConversations = (caseId, userId) =>
  AiConversation.find({ caseId, userId }).sort({ lastMessageAt: -1 }).limit(20).lean();

export const listMessages = (conversationId) =>
  AiMessage.find({ conversationId }).sort({ createdAt: 1 }).lean();

/**
 * Suggested questions built from what this case actually contains — no LLM call, and they
 * can't suggest asking about evidence that isn't there.
 */
export async function suggestQuestions(caseId) {
  const [caseDoc, evidence, entities] = await Promise.all([
    Case.findById(caseId).lean(),
    Evidence.find({ caseId, processingStatus: 'completed' }).select('filename').lean(),
    run(
      `MATCH (n:Entity)-[:PART_OF_CASE]->(:Case {caseId: $caseId})
       WHERE n.type IN ['Person', 'Organization']
       OPTIONAL MATCH (n)-[r]-(:Entity) WHERE type(r) <> 'PART_OF_CASE'
       RETURN n.name AS name, n.type AS type, count(r) AS degree
       ORDER BY degree DESC LIMIT 3`,
      { caseId: String(caseId) },
    ).catch(() => []),
  ]);

  if (!caseDoc) throw new HttpError(404, 'Case not found');
  if (!evidence.length) return { questions: [], reason: 'No processed evidence on this case yet.' };

  const questions = [`What does the evidence establish in ${caseDoc.title}?`];
  for (const entity of entities) {
    questions.push(`What is recorded about ${entity.name}, and what is only suggested?`);
  }
  if (entities.length >= 2) {
    questions.push(`What connects ${entities[0].name} and ${entities[1].name}?`);
  }
  questions.push('What are the significant gaps or unanswered questions in this case?');

  return { questions: questions.slice(0, 5) };
}
