import * as caseService from './case.service.js';
import * as audit from '../audit/audit.service.js';
import { listAudit } from '../audit/audit.service.js';

export async function list(req, res) {
  res.json({ cases: await caseService.listCases(req.validatedQuery) });
}

export async function get(req, res) {
  res.json({ case: await caseService.getCase(req.params.id) });
}

export async function create(req, res) {
  const created = await caseService.createCase(req.body, req.user.id);
  await audit.record(req, 'CREATE_CASE', { resourceType: 'case', resourceId: created._id, caseId: created._id });
  res.status(201).json({ case: created });
}

export async function update(req, res) {
  const updated = await caseService.updateCase(req.params.id, req.body);
  await audit.record(req, 'UPDATE_CASE', {
    resourceType: 'case',
    resourceId: updated._id,
    caseId: updated._id,
    metadata: { fields: Object.keys(req.body) },
  });
  res.json({ case: updated });
}

export async function remove(req, res) {
  const result = await caseService.deleteCase(req.params.id);
  await audit.record(req, 'DELETE_CASE', { resourceType: 'case', resourceId: req.params.id });
  res.json(result);
}

export async function stats(req, res) {
  res.json(await caseService.dashboardStats());
}

export async function auditTrail(req, res) {
  res.json({ entries: await listAudit({ caseId: req.params.id, limit: Number(req.query.limit) || 100 }) });
}
