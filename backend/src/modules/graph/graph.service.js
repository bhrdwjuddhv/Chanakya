import * as repo from './graph.repository.js';
import { splitAttributes } from './graph.repository.js';
import { computeCentrality, gdsAvailable } from './centrality.repository.js';
import { HttpError } from '../../middleware/error.js';

/** Case graph in the shape Cytoscape wants, with the raw props kept on `data`. */
export async function getCaseGraph(caseId, { types, statuses, minConfidence = 0 } = {}) {
  const { nodes, edges } = await repo.getCaseGraph(caseId);

  const keptEdges = edges.filter(
    (e) => (!statuses?.length || statuses.includes(e.status)) && (e.confidence ?? 1) >= minConfidence,
  );
  const keptNodes = types?.length ? nodes.filter((n) => types.includes(n.type)) : nodes;
  const nodeKeys = new Set(keptNodes.map((n) => n.key));

  return {
    nodes: keptNodes.map(toCyNode),
    edges: keptEdges.filter((e) => nodeKeys.has(e.fromKey) && nodeKeys.has(e.toKey)).map(toCyEdge),
  };
}

const toCyNode = (n) => ({
  data: {
    id: n.key,
    label: n.name,
    type: n.type,
    degree: n.degree ?? 0,
    aliases: n.aliases || [],
    attributes: splitAttributes(n),
  },
});

const toCyEdge = (e) => ({
  data: {
    id: e.id,
    source: e.fromKey,
    target: e.toKey,
    label: e.relType,
    type: e.relType,
    status: e.status || 'UNVERIFIED',
    confidence: e.confidence ?? 0.5,
    evidenceSnippet: e.evidenceSnippet || null,
    sourceEvidenceIds: e.sourceEvidenceIds || [],
    extractionMethod: e.extractionMethod,
  },
});

/**
 * Ranked key influencers. Betweenness is weighted highest — the broker connecting
 * otherwise-separate groups is usually the real key figure, not the loudest node.
 */
export async function getInfluencers(caseId, { limit = 10 } = {}) {
  if (!(await gdsAvailable())) {
    throw new HttpError(503, 'Neo4j Graph Data Science plugin is not installed — influencer detection unavailable');
  }

  const { entities, nodeCount, relationshipCount } = await computeCentrality(caseId);
  if (!entities.length) return { influencers: [], communities: [], nodeCount, relationshipCount };

  const max = (field) => Math.max(...entities.map((e) => e[field] || 0), 0) || 1;
  const maxDegree = max('degree');
  const maxBetween = max('betweenness');
  const maxRank = max('pagerank');

  const communitySizes = entities.reduce((acc, e) => {
    acc[e.communityId] = (acc[e.communityId] || 0) + 1;
    return acc;
  }, {});

  const scored = entities
    .map((e) => {
      const norm = {
        degree: (e.degree || 0) / maxDegree,
        betweenness: (e.betweenness || 0) / maxBetween,
        pagerank: (e.pagerank || 0) / maxRank,
      };
      const influenceScore = 0.25 * norm.degree + 0.45 * norm.betweenness + 0.3 * norm.pagerank;
      return { ...e, normalized: norm, influenceScore, communitySize: communitySizes[e.communityId] };
    })
    .sort((a, b) => b.influenceScore - a.influenceScore);

  return {
    nodeCount,
    relationshipCount,
    communities: Object.entries(communitySizes).map(([id, size]) => ({ id: Number(id), size })),
    influencers: scored.slice(0, limit).map((e, i) => ({
      rank: i + 1,
      key: e.key,
      name: e.name,
      type: e.type,
      communityId: e.communityId,
      communitySize: e.communitySize,
      scores: {
        degree: round(e.degree),
        betweenness: round(e.betweenness),
        pagerank: round(e.pagerank, 4),
      },
      influenceScore: round(e.influenceScore, 3),
      reasons: explain(e, entities.length),
    })),
    // every entity, so the graph can size by centrality and colour by community
    entities: scored.map((e) => ({
      key: e.key,
      communityId: e.communityId,
      influenceScore: round(e.influenceScore, 3),
      degree: round(e.degree),
      betweenness: round(e.betweenness),
      pagerank: round(e.pagerank, 4),
    })),
  };
}

/** Plain-English "why", derived straight from the scores — no LLM, nothing to hallucinate. */
function explain(entity, total) {
  const reasons = [];
  const { degree, betweenness, pagerank } = entity.normalized;

  if (degree >= 0.75) {
    reasons.push(`Directly connected to ${entity.degree} other entities — the widest reach in this case.`);
  } else if (degree >= 0.4) {
    reasons.push(`Connected to ${entity.degree} other entities.`);
  }

  if (betweenness >= 0.7) {
    reasons.push(
      'Sits on most of the shortest paths between other entities — information and money have to pass through them. A broker, not a bystander.',
    );
  } else if (betweenness >= 0.3) {
    reasons.push('Bridges groups that are otherwise weakly connected.');
  }

  if (pagerank >= 0.7) {
    reasons.push('Connected to other highly connected entities, not just to many peripheral ones.');
  }

  if (entity.communitySize >= 3) {
    reasons.push(
      `Belongs to a cluster of ${entity.communitySize} entities (${Math.round((entity.communitySize / total) * 100)}% of the network).`,
    );
  }

  if (!reasons.length) reasons.push('Peripheral in this network — few connections and no bridging role.');
  return reasons;
}

const round = (n, places = 2) => Math.round((n || 0) * 10 ** places) / 10 ** places;

export const expandNode = (key, limit) =>
  repo.expandNode(key, limit).then(({ nodes, edges }) => ({
    nodes: nodes.map(toCyNode),
    edges: edges.map(toCyEdge),
  }));

export async function findPath(fromKey, toKey, maxHops) {
  const path = await repo.shortestPath(fromKey, toKey, maxHops);
  if (!path) return { found: false, nodes: [], edges: [], hops: null };
  return {
    found: true,
    hops: path.hops,
    nodes: path.nodes.map(toCyNode),
    edges: path.edges.map(toCyEdge),
  };
}

export async function getNodeDetail(key) {
  const node = await repo.getNode(key);
  if (!node) throw new HttpError(404, 'Entity not found in graph');
  return node;
}

export const searchEntities = (term, limit) => repo.searchEntities(term, limit);

/** Only a human review turns an AI suggestion into CONFIRMED. */
export const reviewRelationship = ({ relationshipId, status, reviewedBy }) =>
  repo.setRelationshipStatus({ relationshipId, status, reviewedBy });

export const removeRelationship = (relationshipId) => repo.deleteRelationship(relationshipId);
