import * as graphService from './graph.service.js';
import * as repo from './graph.repository.js';
import * as audit from '../audit/audit.service.js';
import { entityKey } from './graph.constants.js';

export async function caseGraph(req, res) {
  res.json(await graphService.getCaseGraph(req.params.caseId, req.validatedQuery));
}

export async function influencers(req, res) {
  const result = await graphService.getInfluencers(req.params.caseId, {
    limit: Number(req.query.limit) || 10,
  });
  await audit.record(req, 'RUN_INFLUENCER_ANALYSIS', { resourceType: 'case', caseId: req.params.caseId });
  res.json(result);
}

export async function expand(req, res) {
  res.json(await graphService.expandNode(req.params.key, Number(req.query.limit) || 25));
}

export async function path(req, res) {
  const { from, to, maxHops } = req.validatedQuery;
  res.json(await graphService.findPath(from, to, maxHops));
}

export async function node(req, res) {
  res.json({ node: await graphService.getNodeDetail(req.params.key) });
}

export async function search(req, res) {
  res.json({ entities: await graphService.searchEntities(String(req.query.q || ''), 20) });
}

export async function review(req, res) {
  const { relationshipId, status } = req.body;
  const relationship = await graphService.reviewRelationship({
    relationshipId,
    status,
    reviewedBy: req.user.name,
  });
  await audit.record(req, status === 'CONFIRMED' ? 'CONFIRM_RELATIONSHIP' : 'REVIEW_RELATIONSHIP', {
    resourceType: 'relationship',
    resourceId: relationshipId,
    metadata: { status },
  });
  res.json({ relationship });
}

/** Human-created relationships are CONFIRMED on the spot — a person vouched for them. */
export async function createRelationship(req, res) {
  const { caseId, from, to, type, confidence, note } = req.body;
  await repo.upsertEntity({ type: from.type, name: from.name, caseId });
  await repo.upsertEntity({ type: to.type, name: to.name, caseId });
  const relationship = await repo.upsertRelationship({
    fromKey: entityKey(from.type, from.name),
    toKey: entityKey(to.type, to.name),
    type,
    confidence,
    status: 'CONFIRMED',
    evidenceSnippet: note,
    extractionMethod: 'manual',
    createdBy: req.user.name,
  });
  await audit.record(req, 'CREATE_RELATIONSHIP', {
    resourceType: 'relationship',
    caseId,
    metadata: { type, from: from.name, to: to.name },
  });
  res.status(201).json({ relationship });
}

export async function removeRelationship(req, res) {
  await graphService.removeRelationship(req.params.relationshipId);
  await audit.record(req, 'DELETE_RELATIONSHIP', {
    resourceType: 'relationship',
    resourceId: req.params.relationshipId,
  });
  res.json({ deleted: true });
}
