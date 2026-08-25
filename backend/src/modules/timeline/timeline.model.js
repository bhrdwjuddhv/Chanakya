import { mongoose } from '../../lib/mongoose.js';

const timelineEventSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    occurredAt: { type: Date, required: true, index: true },
    title: { type: String, required: true },
    description: String,
    type: { type: String, default: 'event' }, // event | communication | movement | transaction | evidence | biometric
    confidence: { type: Number, default: 1 },
    source: String, // where this came from, shown in the UI
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' },
    personIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Person' }],
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  },
  { timestamps: true },
);

export const TimelineEvent = mongoose.model('TimelineEvent', timelineEventSchema);
