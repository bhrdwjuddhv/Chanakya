import { run } from '../../lib/neo4j.js';
import { computeCentrality, gdsAvailable } from '../graph/centrality.repository.js';
import { getCaseGraph } from '../graph/graph.repository.js';

/**
 * Rule-based structural pattern detection. Deterministic Cypher and graph metrics —
 * no LLM, so a flag can always be traced back to the structure that produced it.
 *
 * Each finding states what was observed, never what it means. "This entity is the only
 * link between two clusters" is a fact about the graph; "this entity is the ringleader"
 * would be a conclusion, and that is the investigator's to draw.
 */
export async function detectPatterns(caseId) {
  const [crossCase, sharedIntermediary, centralityResult] = await Promise.all([
    findCrossCaseEntities(caseId),
    findSharedIntermediaries(caseId),
    (await gdsAvailable()) ? computeCentrality(caseId) : null,
  ]);

  const findings = [...crossCase, ...sharedIntermediary];

  if (centralityResult?.entities.length) {
    findings.push(...(await findUnnamedBrokers(caseId, centralityResult)));
    findings.push(...(await findCommunityBridges(caseId, centralityResult)));
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    findings,
    gdsAvailable: Boolean(centralityResult),
    checkedAt: new Date().toISOString(),
  };
}

/** Rule 1 — an entity that appears in more than one case. */
async function findCrossCaseEntities(caseId) {
  const rows = await run(
    `MATCH (n:Entity)-[:PART_OF_CASE]->(:Case {caseId: $caseId})
     MATCH (n)-[:PART_OF_CASE]->(c:Case)
     WITH n, collect(DISTINCT c) AS cases
     WHERE size(cases) > 1
     RETURN n.key AS key, n.name AS name, n.type AS type,
            [c IN cases | {caseId: c.caseId, caseNumber: c.caseNumber, title: c.title}] AS cases`,
    { caseId: String(caseId) },
  );

  return rows.map((row) => ({
    rule: 'cross_case_bridge',
    title: 'Entity appears in more than one case',
    severity: 'high',
    entity: { key: row.key, name: row.name, type: row.type },
    observation: `${row.name} is recorded in ${row.cases.length} separate cases: ${row.cases
      .map((c) => c.caseNumber)
      .join(', ')}.`,
    detail:
      'Investigations opened independently share this entity. Either the same person is involved in both, or two records have been merged that should not have been.',
    references: row.cases,
  }));
}

/**
 * Rule 2 — one entity that many otherwise-unconnected entities all route through.
 * This is the Ledger Glass shape: three vendors that never talk to each other, all
 * paying the same consulting company.
 */
async function findSharedIntermediaries(caseId) {
  const rows = await run(
    `MATCH (x:Entity)-[:PART_OF_CASE]->(:Case {caseId: $caseId})
     MATCH (x)-[r]-(n:Entity) WHERE type(r) <> 'PART_OF_CASE'
     WITH x, collect(DISTINCT n) AS neighbours
     WHERE size(neighbours) >= 3
     UNWIND neighbours AS a
     UNWIND neighbours AS b
     WITH x, neighbours, a, b
     WHERE elementId(a) < elementId(b) AND NOT (a)--(b)
     WITH x, size(neighbours) AS neighbourCount, count(*) AS disconnectedPairs,
          collect(DISTINCT a.name)[0..6] AS sample
     // Ratio, not raw count: in a sparse graph any hub racks up disconnected pairs.
     // What marks an intermediary is that its neighbours are *almost all* strangers.
     WITH x, neighbourCount, disconnectedPairs, sample,
          toFloat(disconnectedPairs) / (neighbourCount * (neighbourCount - 1) / 2) AS ratio
     WHERE ratio >= 0.8 AND disconnectedPairs >= 5
     RETURN x.key AS key, x.name AS name, x.type AS type,
            neighbourCount, disconnectedPairs, sample, ratio
     ORDER BY ratio DESC, disconnectedPairs DESC
     LIMIT 3`,
    { caseId: String(caseId) },
  );

  return rows.map((row) => ({
    rule: 'shared_intermediary',
    title: 'Multiple unconnected entities share one intermediary',
    severity: row.ratio >= 0.9 ? 'high' : 'medium',
    entity: { key: row.key, name: row.name, type: row.type },
    observation: `${row.neighbourCount} entities connect through ${row.name}, and ${row.disconnectedPairs} of the ${Math.round((row.neighbourCount * (row.neighbourCount - 1)) / 2)} possible pairs among them (${Math.round(row.ratio * 100)}%) have no direct link to each other.`,
    detail: `Includes ${row.sample.join(', ')}. Parties that do not deal with each other directly but all deal with the same counterparty is the standard shape of a pass-through arrangement — and also of an ordinary shared supplier. The structure alone does not distinguish them.`,
  }));
}

/**
 * Rule 3 — a high-betweenness entity that is not a named suspect. The person holding
 * the network together is often not the person on the charge sheet.
 */
async function findUnnamedBrokers(caseId, { entities }) {
  const maxBetweenness = Math.max(...entities.map((e) => e.betweenness || 0), 0);
  if (!maxBetweenness) return [];

  const candidates = entities.filter(
    (e) => e.type === 'Person' && (e.betweenness || 0) >= maxBetweenness * 0.5,
  );
  if (!candidates.length) return [];

  const roles = await run(
    `MATCH (n:Entity) WHERE n.key IN $keys RETURN n.key AS key, n.role AS role`,
    { keys: candidates.map((c) => c.key) },
  );
  const roleByKey = Object.fromEntries(roles.map((r) => [r.key, r.role]));

  // A victim being central is expected, not suspicious — only flag the unexplained ones.
  return candidates
    .filter((c) => !['suspect', 'victim'].includes(roleByKey[c.key]))
    .map((entity) => ({
      rule: 'unnamed_broker',
      title: 'High-betweenness entity is not a named suspect',
      severity: 'high',
      entity: { key: entity.key, name: entity.name, type: entity.type },
      observation: `${entity.name} has a betweenness score of ${entity.betweenness.toFixed(1)}, among the highest in this case, but is recorded as ${roleByKey[entity.key]?.replaceAll('_', ' ') || 'having no assigned role'}.`,
      detail:
        'Betweenness measures how often an entity sits on the shortest path between two others. A high score with no suspect designation means the case file and the network structure disagree about who matters.',
    }));
}

/** Rule 4 — two clusters joined by a single relationship. Remove it and the network splits. */
async function findCommunityBridges(caseId, { entities }) {
  const communityByKey = Object.fromEntries(entities.map((e) => [e.key, e.communityId]));
  const { edges } = await getCaseGraph(caseId);

  const links = new Map(); // "communityA|communityB" -> edges crossing it
  for (const edge of edges) {
    const a = communityByKey[edge.fromKey];
    const b = communityByKey[edge.toKey];
    if (a == null || b == null || a === b) continue;
    const pair = [a, b].sort((x, y) => x - y).join('|');
    if (!links.has(pair)) links.set(pair, []);
    links.get(pair).push(edge);
  }

  const sizes = entities.reduce((acc, e) => {
    acc[e.communityId] = (acc[e.communityId] || 0) + 1;
    return acc;
  }, {});

  const findings = [];
  for (const [pair, crossing] of links) {
    if (crossing.length !== 1) continue;
    const [a, b] = pair.split('|').map(Number);
    if (sizes[a] < 3 || sizes[b] < 3) continue;

    const edge = crossing[0];
    const from = entities.find((e) => e.key === edge.fromKey);
    const to = entities.find((e) => e.key === edge.toKey);

    findings.push({
      rule: 'community_bridge',
      title: 'Single relationship joins two clusters',
      severity: 'medium',
      entity: { key: edge.fromKey, name: from?.name, type: from?.type },
      observation: `The only connection between a cluster of ${sizes[a]} entities and a cluster of ${sizes[b]} is ${from?.name} — ${edge.relType.replace(/_/g, ' ').toLowerCase()} → ${to?.name}.`,
      detail: `That relationship is currently ${(edge.status || 'UNVERIFIED').replace('_', ' ').toLowerCase()} at ${Math.round((edge.confidence ?? 0) * 100)}% confidence. If it does not hold, these two groups have no established link at all — which makes verifying it disproportionately valuable.`,
      relationshipId: edge.id,
    });
  }

  return findings;
}
