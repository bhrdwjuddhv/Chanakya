import * as forensicService from './forensic.service.js';
import * as audit from '../audit/audit.service.js';
import { HttpError } from '../../middleware/error.js';

export async function analyse(req, res) {
  if (!req.file) throw new HttpError(400, 'A file is required');
  const artifact = await forensicService.analyse({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    declaredMimeType: req.file.mimetype,
    caseId: req.body.caseId || undefined,
    userId: req.user.id,
  });
  await audit.record(req, 'ANALYSE_ARTIFACT', {
    resourceType: 'forensicArtifact',
    resourceId: artifact._id,
    caseId: artifact.caseId,
    metadata: {
      filename: artifact.filename,
      sha256: artifact.sha256,
      detectedType: artifact.detectedType,
      extensionMismatch: artifact.extensionMismatch,
    },
  });
  res.status(201).json({ artifact });
}

export async function list(req, res) {
  res.json({ artifacts: await forensicService.listForCase(req.params.caseId) });
}

export async function get(req, res) {
  res.json({ artifact: await forensicService.getArtifact(req.params.id) });
}

export async function lookup(req, res) {
  const hash = String(req.query.hash || '').trim().toLowerCase();
  if (!/^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(hash)) {
    throw new HttpError(400, 'Provide an MD5, SHA-1 or SHA-256 hash');
  }
  const matches = await forensicService.findByHash(hash);
  await audit.record(req, 'HASH_LOOKUP', { resourceType: 'forensicArtifact', metadata: { hash, hits: matches.length } });
  res.json({ hash, matches });
}
