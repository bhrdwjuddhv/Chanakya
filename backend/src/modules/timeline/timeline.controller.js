import * as timelineService from './timeline.service.js';
import * as audit from '../audit/audit.service.js';

export async function list(req, res) {
  res.json({ events: await timelineService.listForCase(req.params.caseId, req.query) });
}

export async function create(req, res) {
  const event = await timelineService.createEvent({ ...req.body, caseId: req.params.caseId });
  await audit.record(req, 'CREATE_TIMELINE_EVENT', {
    resourceType: 'timelineEvent',
    resourceId: event._id,
    caseId: req.params.caseId,
  });
  res.status(201).json({ event });
}

export async function remove(req, res) {
  const result = await timelineService.deleteEvent(req.params.id);
  await audit.record(req, 'DELETE_TIMELINE_EVENT', { resourceType: 'timelineEvent', resourceId: req.params.id });
  res.json(result);
}
