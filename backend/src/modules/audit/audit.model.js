import { mongoose } from '../../lib/mongoose.js';

// Append-only. Nothing in the app updates or deletes an audit row.
const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    role: String,
    action: { type: String, required: true, index: true },
    resourceType: String,
    resourceId: String,
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
    metadata: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
