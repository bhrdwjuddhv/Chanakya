import * as locationService from './location.service.js';
import * as audit from '../audit/audit.service.js';

export async function list(req, res) {
  res.json({ locations: await locationService.listForCase(req.params.caseId) });
}

export async function create(req, res) {
  const location = await locationService.createLocation({ ...req.body, caseId: req.params.caseId });
  await audit.record(req, 'CREATE_LOCATION', {
    resourceType: 'location',
    resourceId: location._id,
    caseId: req.params.caseId,
  });
  res.status(201).json({ location });
}
