import { Location } from './location.model.js';

export const listForCase = (caseId) =>
  Location.find({ caseId })
    .populate('personIds', 'name role')
    .populate('evidenceIds', 'filename')
    .sort({ name: 1 })
    .lean();

export const createLocation = (data) => Location.create(data).then((d) => d.toObject());
