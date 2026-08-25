import * as personService from './person.service.js';
import * as audit from '../audit/audit.service.js';

export async function list(req, res) {
  res.json({ persons: await personService.listPersons(req.query) });
}

export async function get(req, res) {
  res.json({ person: await personService.getPerson(req.params.id) });
}

export async function create(req, res) {
  const person = await personService.createPerson(req.body);
  await audit.record(req, 'CREATE_PERSON', { resourceType: 'person', resourceId: person._id });
  res.status(201).json({ person });
}

export async function update(req, res) {
  const person = await personService.updatePerson(req.params.id, req.body);
  await audit.record(req, 'UPDATE_PERSON', { resourceType: 'person', resourceId: person._id });
  res.json({ person });
}
