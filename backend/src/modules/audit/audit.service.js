import { AuditLog } from './audit.model.js';
import { logger } from '../../lib/logger.js';

/** Never throws — a failed audit write must not fail the user's action, but it must be loud. */
export async function record(req, action, details = {}) {
  try {
    await AuditLog.create({
      userId: req.user?.id,
      userName: req.user?.name,
      role: req.user?.role,
      action,
      resourceType: details.resourceType,
      resourceId: details.resourceId ? String(details.resourceId) : undefined,
      caseId: details.caseId,
      metadata: details.metadata,
    });
  } catch (err) {
    logger.error(`audit write failed for ${action}: ${err.message}`);
  }
}

export function listAudit({ caseId, limit = 100 }) {
  const query = caseId ? { caseId } : {};
  return AuditLog.find(query).sort({ timestamp: -1 }).limit(Math.min(limit, 500)).lean();
}
