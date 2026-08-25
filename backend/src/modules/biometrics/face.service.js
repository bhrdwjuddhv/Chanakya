import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as provider from '../../lib/biometric/BiometricProvider.js';
import { FaceEnrollment, BiometricMatch } from './biometric.model.js';
import { Person } from '../persons/person.model.js';
import { saveFile } from '../../lib/storage.js';
import { HttpError } from '../../middleware/error.js';
import { logger } from '../../lib/logger.js';
import * as graphRepo from '../graph/graph.repository.js';
import { entityKey } from '../graph/graph.constants.js';

const GALLERY_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../seed/reference-galleries/faces/gallery',
);

/** Enrols one person's images into the InsightFace collection and records the linkage. */
export async function enrollPerson({ personId, images, userId }) {
  const person = await Person.findById(personId);
  if (!person) throw new HttpError(404, 'Person not found');
  if (!images.length) throw new HttpError(400, 'At least one image is required');

  await provider.ensureCollection();

  const existing = await FaceEnrollment.findOne({ personId });
  const result = existing
    ? await provider.addFaceSamples({ personId: existing.insightfacePersonId, images })
    : await provider.enrollPerson({ name: person.name, externalId: String(person._id), images });

  const accepted = result.faces?.length || 0;
  const rejected = result.rejected_images || [];

  // A rejected image means no usable face was found — say so rather than reporting success.
  if (!accepted) {
    throw new HttpError(
      422,
      `No face could be enrolled from ${images.length} image(s). ${describeRejections(rejected)}`,
    );
  }

  const insightfacePersonId = existing?.insightfacePersonId || result.person?.id;
  const enrollment = await FaceEnrollment.findOneAndUpdate(
    { personId },
    {
      personId,
      insightfacePersonId,
      collectionId: provider.FACE_COLLECTION,
      sampleCount: (existing?.sampleCount || 0) + accepted,
      enrolledBy: userId,
    },
    { upsert: true, new: true },
  );

  await Person.updateOne({ _id: personId }, { faceCollectionPersonId: insightfacePersonId });

  return { enrollment: enrollment.toObject(), accepted, rejected: rejected.length, rejections: rejected };
}

const describeRejections = (rejected) =>
  rejected.length
    ? `Engine reported: ${rejected.map((r) => r.reason || r.message || 'rejected').join('; ')}`
    : 'The image may not contain a detectable face.';

/**
 * 1:N search. Persists every candidate as a pending review — a similarity score is not
 * an identification, and the graph is not touched until a person confirms one.
 */
export async function search({ buffer, filename, caseId, limit = 10, userId }) {
  const detection = await provider.detect(buffer, filename);
  if (!detection.faces?.length) {
    throw new HttpError(422, 'No face detected in that image. Try a clearer, front-facing photo.');
  }

  const result = await provider.search({ buffer, filename, limit });
  const { storageUrl } = await saveFile(buffer, filename || 'probe.jpg');
  const searchId = crypto.randomUUID();

  const candidates = await Promise.all(
    (result.matches || []).map(async (match, index) => {
      const externalId = match.person?.external_id;
      const person = externalId
        ? await Person.findById(externalId).lean().catch(() => null)
        : await Person.findOne({ faceCollectionPersonId: match.person?.id }).lean();

      if (!person) {
        logger.warn(`face match ${match.person?.id} has no local person record`);
        return null;
      }

      const record = await BiometricMatch.create({
        caseId: caseId || undefined,
        kind: 'face',
        searchId,
        probeImageUrl: storageUrl,
        candidatePersonId: person._id,
        score: match.similarity ?? match.score,
        rank: index + 1,
        engine: 'insightface/buffalo_l',
      });

      return {
        matchId: record._id,
        rank: index + 1,
        score: record.score,
        person: { _id: person._id, name: person.name, role: person.role, graphKey: person.graphKey },
        reviewStatus: 'pending',
      };
    }),
  );

  return {
    searchId,
    probeImageUrl: storageUrl,
    facesDetected: detection.faces.length,
    threshold: result.threshold,
    processingMs: result.processing_ms,
    engine: 'insightface/buffalo_l',
    candidates: candidates.filter(Boolean),
  };
}

/**
 * Human decision on one candidate. Only 'confirmed' writes to the graph, and it writes
 * a CONFIRMED MATCHED_BY edge attributed to the reviewer.
 */
export async function review({ matchId, status, note, user }) {
  const match = await BiometricMatch.findById(matchId);
  if (!match) throw new HttpError(404, 'Match not found');

  match.reviewStatus = status;
  match.reviewedBy = user.id;
  match.reviewedAt = new Date();
  match.reviewNote = note;
  await match.save();

  if (status !== 'confirmed') return { match: match.toObject(), graphUpdated: false };

  const person = await Person.findById(match.candidatePersonId).lean();
  if (!person) throw new HttpError(404, 'Candidate person no longer exists');

  const caseId = match.caseId || person.caseIds?.[0];
  if (!caseId) return { match: match.toObject(), graphUpdated: false };

  await graphRepo.upsertEntity({ type: 'Person', name: person.name, caseId });
  await graphRepo.upsertEntity({
    type: 'Evidence',
    name: `Face probe ${match.searchId.slice(0, 8)}`,
    caseId,
    attributes: { kind: 'face_probe', imageUrl: match.probeImageUrl, engine: match.engine },
  });
  await graphRepo.upsertRelationship({
    fromKey: entityKey('Person', person.name),
    toKey: entityKey('Evidence', `Face probe ${match.searchId.slice(0, 8)}`),
    type: 'MATCHED_BY',
    confidence: match.score,
    status: 'CONFIRMED',
    evidenceSnippet: `Face match at similarity ${match.score.toFixed(3)} (${match.engine}), confirmed by ${user.name}.`,
    extractionMethod: 'biometric_face',
    createdBy: user.name,
  });

  return { match: match.toObject(), graphUpdated: true, caseId };
}

export const listSearchResults = (searchId) =>
  BiometricMatch.find({ searchId })
    .sort({ rank: 1 })
    .populate('candidatePersonId', 'name role')
    .populate('reviewedBy', 'name')
    .lean();

export const listMatchesForCase = (caseId) =>
  BiometricMatch.find({ caseId })
    .sort({ createdAt: -1 })
    .populate('candidatePersonId', 'name role')
    .populate('reviewedBy', 'name')
    .lean();

/** Who is currently enrolled — drives the real "gallery is empty" state in the UI. */
export async function galleryStatus() {
  const health = await provider.health();
  if (!health.ok) return { ok: false, error: health.error, enrolled: [] };

  const enrollments = await FaceEnrollment.find().populate('personId', 'name role').lean();
  return {
    ok: true,
    collectionId: provider.FACE_COLLECTION,
    enrolled: enrollments.map((e) => ({
      personId: e.personId?._id,
      name: e.personId?.name,
      role: e.personId?.role,
      sampleCount: e.sampleCount,
      enrolledAt: e.enrolledAt,
    })),
  };
}

/**
 * Seed-time enrolment from src/seed/reference-galleries/faces/gallery/<slug>/*.jpg.
 * Returns a report rather than throwing — a missing gallery is a normal state.
 */
export async function enrollReferenceGallery() {
  let slugs;
  try {
    slugs = await fs.readdir(GALLERY_DIR);
  } catch {
    return { skipped: true, reason: 'No reference gallery directory — run prepare-faces.js first.' };
  }

  const health = await provider.health();
  if (!health.ok) return { skipped: true, reason: `InsightFace unreachable: ${health.error}` };

  // Drop the collection first — re-seeding must not stack duplicate identities.
  await provider.resetCollection();
  const report = [];

  for (const slug of slugs) {
    const dir = path.join(GALLERY_DIR, slug);
    const files = (await fs.readdir(dir).catch(() => [])).filter((f) => /\.(jpe?g|png)$/i.test(f));
    if (!files.length) continue;

    // Slug back to the seeded person by name.
    const person = await Person.findOne({
      $expr: {
        $eq: [{ $replaceAll: { input: { $toLower: '$name' }, find: ' ', replacement: '-' } }, slug],
      },
    });
    if (!person) {
      report.push({ slug, enrolled: 0, error: 'No matching person record' });
      continue;
    }

    const images = await Promise.all(
      files.map(async (file) => ({ filename: file, buffer: await fs.readFile(path.join(dir, file)) })),
    );

    try {
      const result = await enrollPerson({ personId: person._id, images });
      report.push({ slug, name: person.name, enrolled: result.accepted });
    } catch (err) {
      report.push({ slug, name: person.name, enrolled: 0, error: err.message });
    }
  }

  return { skipped: false, report };
}
