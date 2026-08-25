import neo4j from 'neo4j-driver';
import { config } from '../config/index.js';
import { logger } from './logger.js';

let driver;

export function getDriver() {
  if (!driver) {
    driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
      { disableLosslessIntegers: true },
    );
  }
  return driver;
}

export async function connectNeo4j() {
  await getDriver().verifyConnectivity();
  logger.info(`neo4j connected: ${config.neo4j.uri}`);
}

export async function neo4jHealth() {
  try {
    await getDriver().verifyConnectivity();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * We read with disableLosslessIntegers, so plain JS numbers go to the server as floats.
 * Cypher's LIMIT/SKIP reject a float, so wrap those params with this.
 */
export const int = (value) => neo4j.int(Math.trunc(Number(value)));

/** Runs Cypher and returns plain JS objects (no neo4j Node/Integer wrappers). */
export async function run(cypher, params = {}) {
  const session = getDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => {
      const obj = {};
      for (const key of r.keys) obj[key] = toPlain(r.get(key));
      return obj;
    });
  } finally {
    await session.close();
  }
}

function toPlain(value) {
  if (value === null || value === undefined) return value;
  if (neo4j.isInt(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(toPlain);
  if (neo4j.types.Node.prototype.isPrototypeOf(value)) {
    return { id: value.elementId, labels: value.labels, ...toPlain(value.properties) };
  }
  if (neo4j.types.Relationship.prototype.isPrototypeOf(value)) {
    return {
      id: value.elementId,
      relType: value.type,
      source: value.startNodeElementId,
      target: value.endNodeElementId,
      ...toPlain(value.properties),
    };
  }
  if (neo4j.types.Path.prototype.isPrototypeOf(value)) {
    return {
      nodes: value.segments.length
        ? [toPlain(value.start), ...value.segments.map((s) => toPlain(s.end))]
        : [toPlain(value.start)],
      relationships: value.segments.map((s) => toPlain(s.relationship)),
    };
  }
  if (typeof value?.toStandardDate === 'function') return value.toStandardDate().toISOString();
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

export async function closeNeo4j() {
  if (driver) await driver.close();
}
