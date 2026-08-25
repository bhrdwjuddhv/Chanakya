import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { config, aiEnabled } from '../../config/index.js';

export class AiUnavailableError extends Error {
  constructor() {
    super('No AI provider key configured — set OPENAI_API_KEY (or ANTHROPIC_API_KEY).');
    this.code = 'AI_UNAVAILABLE';
    this.status = 503;
  }
}

let client;
const openai = () => (client ??= new OpenAI({ apiKey: config.ai.openaiKey }));

export { aiEnabled };
export const EMBED_DIM = 1536; // text-embedding-3-small

/** Embeddings are always OpenAI — Anthropic has no embeddings API. */
export async function embed(texts) {
  if (!config.ai.openaiKey) throw new AiUnavailableError();
  const res = await openai().embeddings.create({ model: config.ai.embedModel, input: texts });
  return res.data.map((d) => d.embedding);
}

/**
 * Chat completion constrained to JSON, validated against a Zod schema.
 * Throws if the model returns something the schema rejects — we never trust raw AI JSON.
 */
export async function chatJson({ system, user, schema, maxTokens = 4000, normalise }) {
  const raw = await rawChat({ system: `${system}\n\nRespond with JSON only.`, user, maxTokens, json: true });
  return validate(schema, JSON.parse(stripFences(raw)), normalise);
}

/**
 * Structured output. On OpenAI this sends the schema to the API so the model is
 * *constrained* to it rather than asked to comply — which removes a whole class of
 * "the model renamed a field" failures. Other providers fall back to prompted JSON
 * plus the caller's normaliser.
 */
export async function chatStructured({ system, user, schema, schemaName = 'result', maxTokens = 4000, normalise }) {
  if (!aiEnabled) throw new AiUnavailableError();

  if (config.ai.provider !== 'anthropic') {
    const res = await openai().chat.completions.create({
      model: config.ai.chatModel,
      max_tokens: maxTokens,
      response_format: zodResponseFormat(schema, schemaName),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const choice = res.choices[0];
    if (choice.message.refusal) throw new Error(`Model refused the request: ${choice.message.refusal}`);
    // Still validated locally — a schema sent to an API is not a guarantee we control.
    return validate(schema, JSON.parse(choice.message.content), normalise);
  }

  return chatJson({ system, user, schema, maxTokens, normalise });
}

function validate(schema, payload, normalise) {
  const candidate = normalise ? normalise(payload) : payload;
  const parsed = schema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`AI output failed validation — ${issues}`);
  }
  return parsed.data;
}

export async function chatText({ system, user, maxTokens = 1500 }) {
  return rawChat({ system, user, maxTokens, json: false });
}

async function rawChat({ system, user, maxTokens, json }) {
  if (!aiEnabled) throw new AiUnavailableError();

  if (config.ai.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.ai.anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.AI_CHAT_MODEL || 'claude-sonnet-5',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic: ${res.status} ${await res.text()}`);
    const body = await res.json();
    return body.content.map((c) => c.text || '').join('');
  }

  const res = await openai().chat.completions.create({
    model: config.ai.chatModel,
    max_tokens: maxTokens,
    response_format: json ? { type: 'json_object' } : undefined,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return res.choices[0].message.content || '';
}

/** Token stream for the RAG assistant. Yields text deltas. */
export async function* chatStream({ system, user, maxTokens = 1500 }) {
  if (!aiEnabled) throw new AiUnavailableError();

  if (config.ai.provider === 'anthropic') {
    // ponytail: non-streamed under a streaming signature. Swap to SSE if the
    // typing effect matters more than one round trip.
    yield await rawChat({ system, user, maxTokens, json: false });
    return;
  }

  const stream = await openai().chat.completions.create({
    model: config.ai.chatModel,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

const stripFences = (s) => s.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
