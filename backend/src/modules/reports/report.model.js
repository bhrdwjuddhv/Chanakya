import { mongoose } from '../../lib/mongoose.js';

const reportSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },

    // Facts / evidence / findings / open questions, each item carrying its own source.
    sections: [
      {
        _id: false,
        key: String,
        title: String,
        description: String,
        items: [{ _id: false, statement: String, source: String }],
      },
    ],
    factCount: Number,
    sourceCount: Number,

    // Kept apart from the fact set on purpose — prose is never evidence.
    aiNarrative: String,
    aiNarrativeStatus: { type: String, enum: ['generated', 'failed', 'unavailable'], default: 'unavailable' },

    status: { type: String, enum: ['draft', 'reviewed', 'final'], default: 'draft', index: true },
    reviewNote: String,
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true },
);

export const Report = mongoose.model('Report', reportSchema);
