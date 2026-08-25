import * as ragService from './rag.service.js';
import * as audit from '../audit/audit.service.js';
import { logger } from '../../lib/logger.js';

/** Server-sent events. Each chunk is one JSON object on a `data:` line. */
export async function ask(req, res) {
  const { caseId } = req.params;
  const { question, conversationId } = req.body;

  await audit.record(req, 'ASK_AI', {
    resourceType: 'case',
    caseId,
    metadata: { question: question.slice(0, 200) },
  });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    for await (const event of ragService.answerQuestion({
      caseId,
      question,
      userId: req.user.id,
      conversationId,
    })) {
      send(event);
      if (res.flush) res.flush();
    }
  } catch (err) {
    logger.error(`rag stream failed: ${err.message}`);
    // The response is already 200 by now, so errors have to travel in-band.
    send({ type: 'error', message: err.message, code: err.code });
  } finally {
    res.end();
  }
}

export async function conversations(req, res) {
  res.json({ conversations: await ragService.listConversations(req.params.caseId, req.user.id) });
}

export async function messages(req, res) {
  res.json({ messages: await ragService.listMessages(req.params.conversationId) });
}

export async function suggestions(req, res) {
  res.json(await ragService.suggestQuestions(req.params.caseId));
}
