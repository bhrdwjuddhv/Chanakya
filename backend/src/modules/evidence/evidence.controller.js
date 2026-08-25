import * as evidenceService from './evidence.service.js';
import * as audit from '../audit/audit.service.js';
import { HttpError } from '../../middleware/error.js';

export async function upload(req, res) {
  if (!req.file) throw new HttpError(400, 'No file uploaded');
  const evidence = await evidenceService.uploadEvidence({
    file: req.file,
    caseId: req.body.caseId,
    userId: req.user.id,
    type: req.body.type,
  });
  await audit.record(req, 'UPLOAD_EVIDENCE', {
    resourceType: 'evidence',
    resourceId: evidence._id,
    caseId: evidence.caseId,
    metadata: { filename: evidence.filename, sha256: evidence.sha256 },
  });
  res.status(201).json({ evidence });
}

export async function list(req, res) {
  res.json({ evidence: await evidenceService.listEvidence(req.params.caseId) });
}

export async function get(req, res) {
  res.json({ evidence: await evidenceService.getEvidence(req.params.id) });
}

export async function text(req, res) {
  res.json(await evidenceService.getEvidenceText(req.params.id));
}

/** Re-runs the pipeline — used after a failure, or once an API key is added. */
export async function reprocess(req, res) {
  const evidence = await evidenceService.getEvidence(req.params.id);
  evidenceService.processEvidence(evidence._id);
  await audit.record(req, 'REPROCESS_EVIDENCE', {
    resourceType: 'evidence',
    resourceId: evidence._id,
    caseId: evidence.caseId,
  });
  res.status(202).json({ status: 'processing' });
}

export async function remove(req, res) {
  const evidence = await evidenceService.getEvidence(req.params.id);
  const result = await evidenceService.deleteEvidence(req.params.id);
  await audit.record(req, 'DELETE_EVIDENCE', {
    resourceType: 'evidence',
    resourceId: req.params.id,
    caseId: evidence.caseId,
  });
  res.json(result);
}
