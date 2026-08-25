import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as afis from '../../lib/biometric/AfisProvider.js';
import { FingerprintTemplate, BiometricMatch } from './biometric.model.js';
import { Person } from '../persons/person.model.js';
import { encrypt, decrypt } from '../../lib/crypto.js';
import { saveFile } from '../../lib/storage.js';
import { HttpError } from '../../middleware/error.js';
import { logger } from '../../lib/logger.js';
import * as graphRepo from '../graph/graph.repository.js';
import { entityKey } from '../graph/graph.constants.js';

const GALLERY_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../seed/reference-galleries/fingerprints/gallery',
);

/** image -> template, stored encrypted. The raw image is never persisted. */
export async function enroll({ personId, finger, buffer, userId }) {
  const person = await Person.findById(personId);
  if (!person) throw new HttpError(404, 'Person not found');

  const { template, minutiae } = await afis.extract(buffer);

  const record = await FingerprintTemplate.findOneAndUpdate(
    { personId, finger: finger || 'unknown' },
    {
      personId,
      finger: finger || 'unknown',
      templateEnc: encrypt(template),
      format: 'sourceafis',
      quality: minutiae,
      createdBy: userId,
    },
    { upsert: true, new: true },
  );

  await Person.updateOne({ _id: personId }, { $addToSet: { fingerprintTemplateIds: record._id } });
  return { templateId: record._id, finger: record.finger, minutiae };
}

/**
 * 1:N against every enrolled template. Candidates are persisted pending review — the
 * graph is untouched until a person confirms one.
 */
export async function search({ buffer, filename, caseId, limit = 10 }) {
  const enrolled = await FingerprintTemplate.find().populate('personId', 'name role graphKey').lean();
  if (!enrolled.length) {
    throw new HttpError(
      409,
      'No fingerprint templates are enrolled. Add a reference gallery before searching.',
    );
  }

  const probe = await afis.extract(buffer);
  const gallery = enrolled.map((row) => ({ id: String(row._id), template: decrypt(row.templateEnc) }));
  const result = await afis.match(probe.template, gallery);

  const { storageUrl } = await saveFile(buffer, filename || 'probe.png');
  const searchId = crypto.randomUUID();
  const byId = Object.fromEntries(enrolled.map((row) => [String(row._id), row]));

  const candidates = [];
  for (const entry of result.matches.slice(0, limit)) {
    const row = byId[entry.id];
    if (!row?.personId) continue;
    if (entry.error) logger.warn(`afis gallery template ${entry.id} unreadable`);

    const record = await BiometricMatch.create({
      caseId: caseId || undefined,
      kind: 'fingerprint',
      searchId,
      probeImageUrl: storageUrl,
      candidatePersonId: row.personId._id,
      score: entry.score,
      rank: entry.rank,
      engine: 'sourceafis',
    });

    candidates.push({
      matchId: record._id,
      rank: entry.rank,
      score: entry.score,
      finger: row.finger,
      aboveThreshold: entry.score >= afis.AFIS_THRESHOLD,
      person: {
        _id: row.personId._id,
        name: row.personId.name,
        role: row.personId.role,
        graphKey: row.personId.graphKey,
      },
      reviewStatus: 'pending',
    });
  }

  return {
    searchId,
    probeImageUrl: storageUrl,
    probeMinutiae: probe.minutiae,
    gallerySize: enrolled.length,
    threshold: afis.AFIS_THRESHOLD,
    engine: 'sourceafis',
    candidates,
  };
}

/** Only 'confirmed' writes a CONFIRMED MATCHED_BY edge, attributed to the reviewer. */
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
  const caseId = match.caseId || person?.caseIds?.[0];
  if (!person || !caseId) return { match: match.toObject(), graphUpdated: false };

  const probeName = `Fingerprint probe ${match.searchId.slice(0, 8)}`;
  await graphRepo.upsertEntity({ type: 'Person', name: person.name, caseId });
  await graphRepo.upsertEntity({
    type: 'Evidence',
    name: probeName,
    caseId,
    attributes: { kind: 'fingerprint_probe', imageUrl: match.probeImageUrl, engine: match.engine },
  });
  await graphRepo.upsertRelationship({
    fromKey: entityKey('Person', person.name),
    toKey: entityKey('Evidence', probeName),
    type: 'MATCHED_BY',
    // SourceAFIS scores are log-scale and unbounded; squashed only to fit the 0-1 slot.
    confidence: Math.min(match.score / 100, 1),
    status: 'CONFIRMED',
    evidenceSnippet: `Fingerprint match, SourceAFIS score ${match.score.toFixed(1)}, confirmed by ${user.name}.`,
    extractionMethod: 'biometric_fingerprint',
    createdBy: user.name,
  });

  return { match: match.toObject(), graphUpdated: true, caseId };
}

/** Real state for the UI: is the engine up, and is anything actually enrolled? */
export async function galleryStatus() {
  const health = await afis.health();
  if (!health.ok) return { ok: false, error: health.error, enrolled: [] };

  const templates = await FingerprintTemplate.find().populate('personId', 'name role').lean();
  return {
    ok: true,
    threshold: afis.AFIS_THRESHOLD,
    enrolled: templates.map((t) => ({
      templateId: t._id,
      personId: t.personId?._id,
      name: t.personId?.name,
      finger: t.finger,
      minutiae: t.quality,
    })),
  };
}

/**
 * Seed-time enrolment from fingerprints/gallery/<person-slug>/<finger>.(png|jpg|bmp).
 * Empty by default — the synthetic generator writes to smoke-test/, not here, because
 * procedural ridge images produce false matches and must not stand in for a real gallery.
 */
export async function enrollReferenceGallery() {
  let slugs;
  try {
    slugs = await fs.readdir(GALLERY_DIR);
  } catch {
    return { skipped: true, reason: 'No fingerprints/gallery directory.' };
  }
  if (!slugs.length) {
    return {
      skipped: true,
      reason:
        'fingerprints/gallery is empty — add a real dataset (SOCOFing or NIST SD302) at ' +
        'fingerprints/gallery/<person-slug>/<finger>.png to enable fingerprint search.',
    };
  }

  const health = await afis.health();
  if (!health.ok) return { skipped: true, reason: `AFIS service unreachable: ${health.error}` };

  const report = [];
  for (const slug of slugs) {
    const dir = path.join(GALLERY_DIR, slug);
    const files = (await fs.readdir(dir).catch(() => [])).filter((f) => /\.(png|jpe?g|bmp)$/i.test(f));
    if (!files.length) continue;

    const person = await Person.findOne({
      $expr: {
        $eq: [{ $replaceAll: { input: { $toLower: '$name' }, find: ' ', replacement: '-' } }, slug],
      },
    });
    if (!person) {
      report.push({ slug, enrolled: 0, error: 'No matching person record' });
      continue;
    }

    let enrolled = 0;
    for (const file of files) {
      try {
        await enroll({
          personId: person._id,
          finger: path.parse(file).name,
          buffer: await fs.readFile(path.join(dir, file)),
        });
        enrolled++;
      } catch (err) {
        report.push({ slug, name: person.name, enrolled: 0, error: `${file}: ${err.message}` });
      }
    }
    if (enrolled) report.push({ slug, name: person.name, enrolled });
  }

  return { skipped: false, report };
}

export const listMatchesForCase = (caseId) =>
  BiometricMatch.find({ caseId, kind: 'fingerprint' })
    .sort({ createdAt: -1 })
    .populate('candidatePersonId', 'name role')
    .lean();
