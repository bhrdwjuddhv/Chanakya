import { run, int } from '../../lib/neo4j.js';
import { assertEntityType, assertRelType, entityKey } from './graph.constants.js';

// Node properties Neo4j/the app owns. Everything else on a node is a caller attribute.
export const RESERVED_NODE_PROPS = new Set(['id', 'labels', 'key', 'name', 'type', 'aliases', 'createdAt', 'updatedAt', 'degree']);

/** Splits a returned node into its own fields plus a free-form `attributes` bag. */
export function splitAttributes(node) {
  const attributes = {};
  for (const [k, v] of Object.entries(node)) {
    if (!RESERVED_NODE_PROPS.has(k)) attributes[k] = v;
  }
  return attributes;
}

/** Upserts an entity, attaches it to the case, and merges aliases/attributes. */
export async function upsertEntity({ type, name, caseId, attributes = {}, aliases = [] }) {
  const label = assertEntityType(type);
  const [row] = await run(
    `MERGE (n:Entity {key: $key})
       ON CREATE SET n.createdAt = datetime()
     SET n:${label},
         n.name = coalesce(n.name, $name),
         n.type = $type,
         n.aliases = apoc.coll.toSet(coalesce(n.aliases, []) + $aliases),
         n.updatedAt = datetime()
     SET n += $attributes
     WITH n
     MATCH (c:Case {caseId: $caseId})
     MERGE (n)-[:PART_OF_CASE]->(c)
     RETURN n`,
    {
      key: entityKey(label, name),
      name,
      type: label,
      caseId: String(caseId),
      attributes: flatten(attributes),
      aliases,
    },
  );
  return row.n;
}

// Neo4j properties must be primitives or arrays of them — anything else is JSON-encoded,
// and reserved names are dropped so an attribute can't overwrite `name` or `key`.
function flatten(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === null || v === undefined || RESERVED_NODE_PROPS.has(k)) continue;
    out[k] = typeof v === 'object' ? JSON.stringify(v) : v;
  }
  return out;
}

/**
 * Upserts a relationship between two existing entities.
 * status defaults to AI_SUGGESTED — nothing the machine writes is ever CONFIRMED on its own.
 */
export async function upsertRelationship({
  fromKey,
  toKey,
  type,
  confidence = 0.5,
  status = 'AI_SUGGESTED',
  sourceEvidenceIds = [],
  evidenceSnippet,
  extractionMethod = 'llm',
  createdBy = 'system',
}) {
  const relType = assertRelType(type);
  const [row] = await run(
    `MATCH (a:Entity {key: $fromKey}), (b:Entity {key: $toKey})
     MERGE (a)-[r:${relType}]->(b)
       ON CREATE SET r.createdAt = datetime(), r.createdBy = $createdBy, r.status = $status
     SET r.type = $type,
         r.confidence = CASE WHEN r.confidence IS NULL OR $confidence > r.confidence
                             THEN $confidence ELSE r.confidence END,
         r.sourceEvidenceIds = apoc.coll.toSet(coalesce(r.sourceEvidenceIds, []) + $sourceEvidenceIds),
         r.evidenceSnippet = coalesce($evidenceSnippet, r.evidenceSnippet),
         r.extractionMethod = $extractionMethod,
         r.updatedAt = datetime()
     RETURN r`,
    {
      fromKey,
      toKey,
      type: relType,
      confidence,
      status,
      sourceEvidenceIds: sourceEvidenceIds.map(String),
      evidenceSnippet: evidenceSnippet || null,
      extractionMethod,
      createdBy,
    },
  );
  return row?.r;
}

export async function setRelationshipStatus({ relationshipId, status, reviewedBy }) {
  const [row] = await run(
    `MATCH ()-[r]->() WHERE elementId(r) = $relationshipId
     SET r.status = $status, r.reviewedBy = $reviewedBy, r.reviewedAt = datetime()
     RETURN r`,
    { relationshipId, status, reviewedBy },
  );
  return row?.r;
}

export async function deleteRelationship(relationshipId) {
  await run(`MATCH ()-[r]->() WHERE elementId(r) = $relationshipId DELETE r`, { relationshipId });
}

/** The whole case subgraph: every entity on the case plus edges between them. */
export async function getCaseGraph(caseId) {
  const nodes = await run(
    `MATCH (n:Entity)-[:PART_OF_CASE]->(c:Case {caseId: $caseId})
     OPTIONAL MATCH (n)-[r]-(:Entity)
     WHERE type(r) <> 'PART_OF_CASE'
     RETURN n, count(DISTINCT r) AS degree`,
    { caseId: String(caseId) },
  );

  const edges = await run(
    `MATCH (a:Entity)-[:PART_OF_CASE]->(c:Case {caseId: $caseId})
     MATCH (b:Entity)-[:PART_OF_CASE]->(c)
     MATCH (a)-[r]->(b)
     WHERE type(r) <> 'PART_OF_CASE'
     RETURN r, a.key AS fromKey, b.key AS toKey`,
    { caseId: String(caseId) },
  );

  return {
    nodes: nodes.map(({ n, degree }) => ({ ...n, degree })),
    edges: edges.map(({ r, fromKey, toKey }) => ({ ...r, fromKey, toKey })),
  };
}

/** One hop out from a node, including entities on other cases — that's how cross-case links surface. */
export async function expandNode(key, limit = 25) {
  const rows = await run(
    `MATCH (n:Entity {key: $key})-[r]-(m:Entity)
     WHERE type(r) <> 'PART_OF_CASE'
     RETURN r, m, startNode(r).key AS fromKey, endNode(r).key AS toKey
     LIMIT $limit`,
    { key, limit: int(limit) },
  );
  return {
    nodes: rows.map((row) => row.m),
    edges: rows.map(({ r, fromKey, toKey }) => ({ ...r, fromKey, toKey })),
  };
}

export async function shortestPath(fromKey, toKey, maxHops = 6) {
  const rows = await run(
    `MATCH (a:Entity {key: $fromKey}), (b:Entity {key: $toKey})
     MATCH p = shortestPath((a)-[*..${Number(maxHops) || 6}]-(b))
     WHERE none(r IN relationships(p) WHERE type(r) = 'PART_OF_CASE')
     RETURN p`,
    { fromKey, toKey },
  );
  if (!rows.length) return null;
  const { nodes, relationships } = rows[0].p;
  return {
    nodes,
    edges: relationships.map((r, i) => ({ ...r, fromKey: nodes[i].key, toKey: nodes[i + 1].key })),
    hops: relationships.length,
  };
}

export async function getNode(key) {
  const [row] = await run(
    `MATCH (n:Entity {key: $key})
     OPTIONAL MATCH (n)-[:PART_OF_CASE]->(c:Case)
     OPTIONAL MATCH (n)-[r]-(:Entity) WHERE type(r) <> 'PART_OF_CASE'
     RETURN n,
            collect(DISTINCT {caseId: c.caseId, title: c.title, caseNumber: c.caseNumber}) AS cases,
            count(DISTINCT r) AS relationshipCount`,
    { key },
  );
  if (!row?.n) return null;
  return {
    ...row.n,
    attributes: splitAttributes(row.n),
    cases: row.cases.filter((c) => c.caseId),
    relationshipCount: row.relationshipCount,
  };
}

export async function searchEntities(term, limit = 20) {
  return (
    await run(
      `MATCH (n:Entity) WHERE toLower(n.name) CONTAINS toLower($term)
       RETURN n LIMIT $limit`,
      { term, limit: int(limit) },
    )
  ).map((r) => r.n);
}
