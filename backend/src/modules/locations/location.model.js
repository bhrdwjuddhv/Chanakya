import { mongoose } from '../../lib/mongoose.js';

const locationSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    name: { type: String, required: true },
    address: String,
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    type: { type: String, default: 'site' }, // site | crime_scene | residence | business | sighting
    description: String,
    personIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Person' }],
    evidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
  },
  { timestamps: true },
);

export const Location = mongoose.model('Location', locationSchema);
