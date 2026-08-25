import * as osintService from './osint.service.js';
import * as audit from '../audit/audit.service.js';

export async function connectors(req, res) {
  res.json(osintService.listConnectors());
}

export async function search(req, res) {
  const { query, kind, sources, caseId } = req.body;
  const result = await osintService.search({ query, kind, sources, caseId, userId: req.user.id });
  await audit.record(req, 'OSINT_SEARCH', {
    resourceType: 'osintSearch',
    resourceId: result.searchId,
    caseId,
    metadata: { query, kind, sources: result.sources.map((s) => s.id), hits: result.findings.length },
  });
  res.json(result);
}

export async function accept(req, res) {
  const result = await osintService.accept({
    findingId: req.params.id,
    caseId: req.body.caseId,
    user: req.user,
  });
  await audit.record(req, 'ACCEPT_OSINT_FINDING', {
    resourceType: 'osintFinding',
    resourceId: req.params.id,
    caseId: result.caseId,
    metadata: { entitiesAdded: result.entitiesAdded },
  });
  res.json(result);
}

export async function dismiss(req, res) {
  const result = await osintService.dismiss({ findingId: req.params.id, user: req.user });
  await audit.record(req, 'DISMISS_OSINT_FINDING', { resourceType: 'osintFinding', resourceId: req.params.id });
  res.json(result);
}

export async function list(req, res) {
  res.json({ findings: await osintService.listForCase(req.params.caseId) });
}
