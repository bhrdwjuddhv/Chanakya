import * as faceService from './face.service.js';
import * as fingerprintService from './fingerprint.service.js';
import * as audit from '../audit/audit.service.js';
import { HttpError } from '../../middleware/error.js';

export async function status(req, res) {
  res.json(await faceService.galleryStatus());
}

export async function enroll(req, res) {
  if (!req.files?.length) throw new HttpError(400, 'At least one image is required');
  const result = await faceService.enrollPerson({
    personId: req.body.personId,
    userId: req.user.id,
    images: req.files.map((f) => ({ filename: f.originalname, buffer: f.buffer })),
  });
  // Deliberately records counts only — never the image or the embedding.
  await audit.record(req, 'ENROLL_FACE', {
    resourceType: 'person',
    resourceId: req.body.personId,
    metadata: { accepted: result.accepted, rejected: result.rejected },
  });
  res.status(201).json(result);
}

export async function search(req, res) {
  if (!req.file) throw new HttpError(400, 'A probe image is required');
  const result = await faceService.search({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    caseId: req.body.caseId || undefined,
    userId: req.user.id,
  });
  await audit.record(req, 'FACE_SEARCH', {
    resourceType: 'biometricSearch',
    resourceId: result.searchId,
    caseId: req.body.caseId || undefined,
    metadata: { candidates: result.candidates.length, engine: result.engine },
  });
  res.json(result);
}

export async function review(req, res) {
  const { matchId, status, note } = req.body;
  const result = await faceService.review({ matchId, status, note, user: req.user });
  await audit.record(req, `${status.toUpperCase()}_FACE_MATCH`, {
    resourceType: 'biometricMatch',
    resourceId: matchId,
    caseId: result.caseId,
    metadata: { status, graphUpdated: result.graphUpdated },
  });
  res.json(result);
}

export async function searchResults(req, res) {
  res.json({ candidates: await faceService.listSearchResults(req.params.searchId) });
}

export async function caseMatches(req, res) {
  res.json({ matches: await faceService.listMatchesForCase(req.params.caseId) });
}

// --- fingerprint ------------------------------------------------------------

export async function fingerprintStatus(req, res) {
  res.json(await fingerprintService.galleryStatus());
}

export async function fingerprintEnroll(req, res) {
  if (!req.file) throw new HttpError(400, 'A fingerprint image is required');
  const result = await fingerprintService.enroll({
    personId: req.body.personId,
    finger: req.body.finger,
    buffer: req.file.buffer,
    userId: req.user.id,
  });
  await audit.record(req, 'ENROLL_FINGERPRINT', {
    resourceType: 'person',
    resourceId: req.body.personId,
    metadata: { finger: result.finger, minutiae: result.minutiae },
  });
  res.status(201).json(result);
}

export async function fingerprintSearch(req, res) {
  if (!req.file) throw new HttpError(400, 'A probe image is required');
  const result = await fingerprintService.search({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    caseId: req.body.caseId || undefined,
  });
  await audit.record(req, 'FINGERPRINT_SEARCH', {
    resourceType: 'biometricSearch',
    resourceId: result.searchId,
    caseId: req.body.caseId || undefined,
    metadata: { gallerySize: result.gallerySize, candidates: result.candidates.length },
  });
  res.json(result);
}

export async function fingerprintReview(req, res) {
  const { matchId, status, note } = req.body;
  const result = await fingerprintService.review({ matchId, status, note, user: req.user });
  await audit.record(req, `${status.toUpperCase()}_FINGERPRINT_MATCH`, {
    resourceType: 'biometricMatch',
    resourceId: matchId,
    caseId: result.caseId,
    metadata: { status, graphUpdated: result.graphUpdated },
  });
  res.json(result);
}
