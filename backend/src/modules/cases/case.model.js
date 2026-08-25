import { mongoose } from '../../lib/mongoose.js';

export const CASE_STATUS = ['open', 'active', 'pending_review', 'closed', 'cold'];
export const CASE_PRIORITY = ['low', 'medium', 'high', 'critical'];
export const CASE_CLASSIFICATION = ['unclassified', 'restricted', 'confidential', 'secret'];

const caseSchema = new mongoose.Schema(
  {
    caseNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: String,
    status: { type: String, enum: CASE_STATUS, default: 'open' },
    priority: { type: String, enum: CASE_PRIORITY, default: 'medium' },
    classification: { type: String, enum: CASE_CLASSIFICATION, default: 'restricted' },
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Case = mongoose.model('Case', caseSchema);
