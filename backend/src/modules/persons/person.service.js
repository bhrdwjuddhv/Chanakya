import { Person } from './person.model.js';
import { HttpError } from '../../middleware/error.js';

export function listPersons({ caseId, q } = {}) {
  const filter = {};
  if (caseId) filter.caseIds = caseId;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { aliases: new RegExp(q, 'i') }];
  return Person.find(filter).sort({ name: 1 }).populate('caseIds', 'caseNumber title').lean();
}

export async function getPerson(id) {
  const person = await Person.findById(id).populate('caseIds', 'caseNumber title').lean();
  if (!person) throw new HttpError(404, 'Person not found');
  return person;
}

export const createPerson = (data) => Person.create(data).then((d) => d.toObject());

export async function updatePerson(id, data) {
  const updated = await Person.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  if (!updated) throw new HttpError(404, 'Person not found');
  return updated;
}
