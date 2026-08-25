import { run } from '../../lib/neo4j.js';

const graphName = (caseId) => `case_${String(caseId)}`;

/**
 * Projects the case subgraph into GDS as undirected (association networks have no
 * meaningful direction for centrality), runs the four algorithms, drops the projection.
 * Returns one row per entity with all four scores — the UI ranks client-side.
 */
export async function computeCentrality(caseId) {
  const name = graphName(caseId);
  await dropProjection(name);

  const projected = await run(
    `MATCH (a:Entity)-[:PART_OF_CASE]->(c:Case {caseId: $caseId})
     MATCH (b:Entity)-[:PART_OF_CASE]->(c)
     MATCH (a)-[r]->(b)
     WHERE type(r) <> 'PART_OF_CASE'
     WITH gds.graph.project($name, a, b, {}, {undirectedRelationshipTypes: ['*']}) AS g
     RETURN g.nodeCount AS nodeCount, g.relationshipCount AS relationshipCount`,
    { caseId: String(caseId), name },
  );

  const { nodeCount = 0, relationshipCount = 0 } = projected[0] || {};
  if (!nodeCount) {
    await dropProjection(name);
    return { nodeCount: 0, relationshipCount: 0, entities: [] };
  }

  try {
    // ponytail: four separate streams joined in JS. Chaining them in one Cypher
    // query is a cartesian product over the node set — this is O(4n) instead.
    const [degree, betweenness, pagerank, louvain] = await Promise.all([
      stream(name, 'gds.degree.stream', 'score'),
      stream(name, 'gds.betweenness.stream', 'score'),
      stream(name, 'gds.pageRank.stream', 'score'),
      stream(name, 'gds.louvain.stream', 'communityId'),
    ]);

    const byKey = new Map();
    const merge = (rows, field) => {
      for (const row of rows) {
        const entry = byKey.get(row.key) || { key: row.key, name: row.name, type: row.type };
        entry[field] = row.value;
        byKey.set(row.key, entry);
      }
    };
    merge(degree, 'degree');
    merge(betweenness, 'betweenness');
    merge(pagerank, 'pagerank');
    merge(louvain, 'communityId');

    return { nodeCount, relationshipCount, entities: [...byKey.values()] };
  } finally {
    await dropProjection(name);
  }
}

async function stream(name, procedure, yieldField) {
  return run(
    `CALL ${procedure}($name) YIELD nodeId, ${yieldField}
     WITH gds.util.asNode(nodeId) AS n, ${yieldField} AS value
     RETURN n.key AS key, n.name AS name, n.type AS type, value`,
    { name },
  );
}

async function dropProjection(name) {
  await run(`CALL gds.graph.drop($name, false) YIELD graphName RETURN graphName`, { name }).catch(
    () => {},
  );
}

/** False when GDS isn't installed — lets callers show a real "unavailable" state. */
export async function gdsAvailable() {
  try {
    await run(`RETURN gds.version() AS v`);
    return true;
  } catch {
    return false;
  }
}
