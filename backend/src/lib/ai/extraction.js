import { z } from 'zod';
import { chatStructured, chatText } from './provider.js';
import { ENTITY_TYPES, RELATIONSHIP_TYPES } from '../../modules/graph/graph.constants.js';

/**
 * Schema shaped for OpenAI strict structured outputs, which constrains the model rather
 * than asking it nicely. Strict mode has two rules that drive the shape here:
 *   - every property must be required (no .optional(); use "" / [] for absent values)
 *   - no open-ended maps, so attributes are key/value pairs rather than z.record()
 *
 * Prompt-only JSON was measurably unreliable: the model returned `source`/`target`
 * instead of `fromTempId`/`toTempId` and omitted `confidence` entirely, which Zod
 * correctly rejected — failing the whole document rather than corrupting the graph.
 */
export const extractionSchema = z.object({
  entities: z.array(
    z.object({
      tempId: z.string(),
      type: z.enum(ENTITY_TYPES),
      name: z.string(),
      attributes: z.array(z.object({ key: z.string(), value: z.string() })),
      confidence: z.number(),
    }),
  ),
  relationships: z.array(
    z.object({
      fromTempId: z.string(),
      toTempId: z.string(),
      type: z.enum(RELATIONSHIP_TYPES),
      confidence: z.number(),
      evidenceSnippet: z.string(),
    }),
  ),
});

const SYSTEM = `You are an entity and relationship extractor for a criminal investigation platform.

Extract only what the text actually states. Do not infer, do not add world knowledge, do not
invent people, places or connections. If the text is thin, return few entities — that is correct.

Rules:
- Give every entity a tempId ("e1", "e2", ...). Relationships reference those tempIds in
  fromTempId and toTempId.
- Use the person's full name as it appears. Put nicknames in attributes as key "alias".
- attributes is a list of {key, value} pairs, both strings. Use an empty list if there are none.
- confidence reflects how explicitly the text states it: 0.9+ stated outright,
  0.5-0.8 strongly implied, below 0.5 weak.
- evidenceSnippet must be a verbatim quote from the text, under 400 characters. Use an empty
  string only if no single quote supports the relationship.
- Never emit a PART_OF_CASE relationship — the system owns case membership.`;

export async function extractEntities(chunks) {
  const numbered = chunks
    .map((c) => `[chunk ${c.chunkId}]\n${c.content}`)
    .join('\n\n---\n\n')
    .slice(0, 60000);

  const result = await chatStructured({
    system: SYSTEM,
    user: `Extract entities and relationships from this evidence document.\n\n${numbered}`,
    schema: extractionSchema,
    schemaName: 'entity_extraction',
    normalise: normaliseExtraction,
  });

  // Collapse the strict-mode pair list back into a plain attributes object.
  return {
    entities: result.entities.map((entity) => ({
      ...entity,
      attributes: Object.fromEntries((entity.attributes || []).map((a) => [a.key, a.value])),
    })),
    relationships: result.relationships,
  };
}

/**
 * Tolerance layer for providers without strict schema support (the Anthropic path).
 * Maps the key aliases models actually emit and fills the fields they drop, so a
 * cosmetic naming difference does not fail an entire document.
 */
export function normaliseExtraction(raw) {
  const pairs = (value) => {
    if (Array.isArray(value)) return value.filter((p) => p && p.key != null);
    if (value && typeof value === 'object') {
      return Object.entries(value).map(([key, v]) => ({ key, value: String(v) }));
    }
    return [];
  };

  return {
    entities: (raw?.entities || []).map((e, i) => ({
      tempId: e.tempId ?? e.id ?? `e${i + 1}`,
      type: e.type ?? e.entityType,
      name: e.name ?? e.entity_name ?? e.label ?? e.value ?? '',
      attributes: pairs(e.attributes),
      confidence: numberOr(e.confidence ?? e.score ?? e.certainty, 0.5),
    })),
    relationships: (raw?.relationships || []).map((r) => ({
      fromTempId: r.fromTempId ?? r.from ?? r.source ?? r.subject ?? '',
      toTempId: r.toTempId ?? r.to ?? r.target ?? r.object ?? '',
      type: r.type ?? r.relationship ?? r.relType,
      confidence: numberOr(r.confidence ?? r.score, 0.5),
      evidenceSnippet: String(r.evidenceSnippet ?? r.evidence ?? r.snippet ?? '').slice(0, 400),
    })),
  };
}

const numberOr = (value, fallback) => (typeof value === 'number' && !Number.isNaN(value) ? value : fallback);

export async function summarizeEvidence(text, filename) {
  return chatText({
    system:
      'You summarise evidence documents for investigators. 3-5 sentences, factual, no speculation. ' +
      'Name the key people, organisations and dates the document actually mentions.',
    user: `Document: ${filename}\n\n${text.slice(0, 20000)}`,
    maxTokens: 400,
  });
}
