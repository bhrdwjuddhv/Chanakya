import crypto from 'node:crypto';
import { OsintFinding } from './osint.model.js';
import { CONNECTORS, connectorById, describeConnectors } from './connectors/index.js';
import { DEMO_NOTICE } from './connectors/demoRegistry.js';
import { run } from '../../lib/neo4j.js';
import { logger } from '../../lib/logger.js';
import { HttpError } from '../../middleware/error.js';
import * as graphRepo from '../graph/graph.repository.js';
import { entityKey, ENTITY_TYPES } from '../graph/graph.constants.js';

export const listConnectors = () => ({ connectors: describeConnectors(), notice: DEMO_NOTICE });

/**
 * Fan out to the selected connectors, normalise, then resolve every proposed entity
 * against what the case graph already holds.
 *
 * Nothing is written to the graph here — a search is a search. The investigator decides
 * which findings are worth keeping, and even then they land unverified.
 */
export async function search({ query, kind, sources, caseId, userId }) {
  const selected = (sources?.length ? sources.map(connectorById).filter(Boolean) : CONNECTORS);
  if (!selected.length) throw new HttpError(400, 'No known source selected');

  const searchId = crypto.randomUUID();
  const results = await Promise.all(
    selected.map(async (connector) => {
      try {
        const records = await connector.search({ query, kind });
        return { connector, records, error: null };
      } catch (err) {
        // One dead source must not fail the whole lookup — report it instead.
        logger.warn(`osint connector ${connector.id} failed: ${err.message}`);
        return { connector, records: [], error: err.message };
      }
    }),
  );

  const existing = caseId ? await caseEntityIndex(caseId) : new Map();
  const findings = [];

  for (const { connector, records, error } of results) {
    for (const record of records) {
      const entities = (record.entities || [])
        .filter((e) => ENTITY_TYPES.includes(e.type) && e.name)
        .map((e) => ({
          ...e,
          // Entity resolution: does the case already know this?
          resolution: existing.get(entityKey(e.type, e.name)) ? 'existing' : 'new',
        }));

      const finding = await OsintFinding.create({
        searchId,
        caseId: caseId || undefined,
        query,
        kind,
        source: connector.id,
        sourceName: connector.name,
        sourceId: record.sourceId,
        title: record.title,
        recordKind: record.kind,
        confidence: record.confidence,
        attributes: record.attributes,
        entities,
        relationships: record.relationships || [],
        note: record.note,
        createdBy: userId,
      });

      findings.push({ ...finding.toObject(), connectorError: error });
    }
  }

  return {
    searchId,
    query,
    kind,
    sources: results.map(({ connector, records, error }) => ({
      id: connector.id,
      name: connector.name,
      dataSource: connector.dataSource,
      hits: records.length,
      error,
    })),
    findings,
  };
}

/** Every entity key already attached to the case, for resolution. */
async function caseEntityIndex(caseId) {
  try {
    const rows = await run(
      `MATCH (n:Entity)-[:PART_OF_CASE]->(:Case {caseId: $caseId}) RETURN n.key AS key, n.name AS name`,
      { caseId: String(caseId) },
    );
    return new Map(rows.map((r) => [r.key, r.name]));
  } catch (err) {
    logger.warn(`osint entity resolution unavailable: ${err.message}`);
    return new Map();
  }
}

/**
 * Promotes one finding into the case graph.
 *
 * Open-source material is an unverified lead, so entities arrive and relationships land
 * as INFERRED with the source recorded. A human still has to confirm them in the graph.
 */
export async function accept({ findingId, caseId, user }) {
  const finding = await OsintFinding.findById(findingId);
  if (!finding) throw new HttpError(404, 'Finding not found');

  const targetCase = caseId || finding.caseId;
  if (!targetCase) throw new HttpError(400, 'A case is required to add this to the graph');

  const sourceNode = `${finding.sourceName}: ${finding.sourceId}`;
  await graphRepo.upsertEntity({
    type: 'Document',
    name: sourceNode,
    caseId: targetCase,
    attributes: { source: finding.source, query: finding.query, recordKind: finding.recordKind },
  });

  for (const entity of finding.entities) {
    await graphRepo.upsertEntity({
      type: entity.type,
      name: entity.name,
      caseId: targetCase,
      attributes: { source: 'osint', sourceRecord: finding.sourceId },
    });
    await graphRepo.upsertRelationship({
      fromKey: entityKey(entity.type, entity.name),
      toKey: entityKey('Document', sourceNode),
      type: 'MENTIONED_IN',
      confidence: finding.confidence ?? 0.5,
      status: 'INFERRED',
      evidenceSnippet: `Open-source record ${finding.sourceId} from ${finding.sourceName}.`,
      extractionMethod: 'osint',
      createdBy: user.name,
    });
  }

  const byName = Object.fromEntries(finding.entities.map((e) => [e.name, e.type]));
  for (const rel of finding.relationships || []) {
    if (!byName[rel.from] || !byName[rel.to]) continue;
    await graphRepo.upsertRelationship({
      fromKey: entityKey(byName[rel.from], rel.from),
      toKey: entityKey(byName[rel.to], rel.to),
      type: rel.type,
      confidence: finding.confidence ?? 0.5,
      status: 'INFERRED',
      evidenceSnippet: `Asserted by ${finding.sourceName} record ${finding.sourceId}.`,
      extractionMethod: 'osint',
      createdBy: user.name,
    });
  }

  finding.status = 'accepted';
  finding.caseId = targetCase;
  finding.reviewedBy = user.id;
  finding.reviewedAt = new Date();
  await finding.save();

  return { finding: finding.toObject(), entitiesAdded: finding.entities.length, caseId: targetCase };
}

export async function dismiss({ findingId, user }) {
  const finding = await OsintFinding.findByIdAndUpdate(
    findingId,
    { status: 'dismissed', reviewedBy: user.id, reviewedAt: new Date() },
    { new: true },
  );
  if (!finding) throw new HttpError(404, 'Finding not found');
  return { finding: finding.toObject() };
}

export const listForCase = (caseId) =>
  OsintFinding.find({ caseId }).sort({ createdAt: -1 }).populate('reviewedBy', 'name').lean();
