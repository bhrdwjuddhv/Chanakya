import { TimelineEvent } from './timeline.model.js';
import { HttpError } from '../../middleware/error.js';

export function listForCase(caseId, { type, personId } = {}) {
  const filter = { caseId };
  if (type) filter.type = type;
  if (personId) filter.personIds = personId;
  return TimelineEvent.find(filter)
    .sort({ occurredAt: 1 })
    .populate('personIds', 'name role')
    .populate('locationId', 'name lat lng')
    .lean();
}

export const createEvent = (data) => TimelineEvent.create(data).then((d) => d.toObject());

export async function deleteEvent(id) {
  const found = await TimelineEvent.findByIdAndDelete(id);
  if (!found) throw new HttpError(404, 'Timeline event not found');
  return { deleted: true };
}
