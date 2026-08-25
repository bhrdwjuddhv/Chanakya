import crypto from 'node:crypto';
import exifr from 'exifr';
import sharp from 'sharp';

import { ForensicArtifact } from './forensic.model.js';
import { detectFileType, extensionMismatch } from './fileType.js';
import { extractIndicators, INDICATOR_ENTITY_TYPE } from './indicators.js';
import { saveFile } from '../../lib/storage.js';
import { chatText, aiEnabled } from '../../lib/ai/provider.js';
import { logger } from '../../lib/logger.js';
import { HttpError } from '../../middleware/error.js';
import * as graphRepo from '../graph/graph.repository.js';
import { entityKey } from '../graph/graph.constants.js';
import { Case } from '../cases/case.model.js';

const digest = (algorithm, buffer) => crypto.createHash(algorithm).update(buffer).digest('hex');

/**
 * Full artefact analysis. Everything here is computed from the bytes — hashes, the real
 * file type, EXIF, indicators. The only optional part is the AI summary, and its absence
 * is reported rather than hidden.
 */
export async function analyse({ buffer, filename, declaredMimeType, caseId, userId }) {
  if (caseId && !(await Case.exists({ _id: caseId }))) throw new HttpError(404, 'Case not found');

  const detected = detectFileType(buffer, filename);
  const { storageUrl } = await saveFile(buffer, filename);

  const metadata = await describe(buffer, detected, filename);
  const text = textOf(buffer, detected);
  const indicators = extractIndicators(text);

  const artifact = await ForensicArtifact.create({
    caseId: caseId || undefined,
    filename,
    storageUrl,
    bytes: buffer.length,
    declaredMimeType,
    sha256: digest('sha256', buffer),
    sha1: digest('sha1', buffer),
    md5: digest('md5', buffer),
    detectedType: detected.type,
    detectedMimeType: detected.mime,
    classification: detected.classification,
    extensionMismatch: extensionMismatch(filename, detected.mime),
    metadata: metadata.properties,
    gps: metadata.gps,
    indicators,
    analysedBy: userId,
  });

  if (aiEnabled) {
    artifact.aiSummary = await summarise(artifact, text).catch((err) => {
      logger.warn(`forensic summary failed: ${err.message}`);
      return undefined;
    });
  }

  if (caseId) artifact.entitiesAdded = await pushToGraph(artifact, caseId);
  await artifact.save();

  return artifact.toObject();
}

/** Image properties + EXIF (including GPS), or text statistics for a document. */
async function describe(buffer, detected, filename) {
  if (detected.classification === 'image') {
    const properties = {};
    let gps;
    try {
      const image = await sharp(buffer).metadata();
      Object.assign(properties, {
        width: image.width,
        height: image.height,
        format: image.format,
        colourSpace: image.space,
        channels: image.channels,
        hasAlpha: image.hasAlpha,
        density: image.density,
        orientation: image.orientation,
      });
    } catch (err) {
      properties.imageError = err.message;
    }

    try {
      const exif = await exifr.parse(buffer, { gps: true, tiff: true, exif: true, ifd0: true });
      if (exif) {
        // Camera and timestamps are the forensically interesting fields; the rest is noise.
        Object.assign(properties, prune({
          cameraMake: exif.Make,
          cameraModel: exif.Model,
          lens: exif.LensModel,
          software: exif.Software,
          takenAt: exif.DateTimeOriginal || exif.CreateDate,
          modifiedAt: exif.ModifyDate,
          exposureTime: exif.ExposureTime,
          fNumber: exif.FNumber,
          iso: exif.ISO,
          artist: exif.Artist,
          copyright: exif.Copyright,
        }));
        if (typeof exif.latitude === 'number' && typeof exif.longitude === 'number') {
          gps = { lat: exif.latitude, lng: exif.longitude };
        }
      } else {
        properties.exif = 'No EXIF present — stripped, or never written.';
      }
    } catch {
      properties.exif = 'EXIF block present but unreadable.';
    }

    return { properties, gps };
  }

  const text = textOf(buffer, detected);
  if (!text) return { properties: { note: `Binary ${detected.type} — no printable strings found.`, filename } };

  const lines = text.split(/\r?\n/);
  if (detected.type === 'text') {
    return {
      properties: {
        characters: text.length,
        lines: lines.length,
        words: text.split(/\s+/).filter(Boolean).length,
        longestLine: Math.max(...lines.map((l) => l.length), 0),
        encoding: 'utf-8 (assumed)',
      },
    };
  }

  // Be explicit that these came from a strings dump, not a decoded document.
  return {
    properties: {
      note: `Binary ${detected.type}. Indicators come from extracted printable strings, not decoded content.`,
      printableStrings: lines.length,
      stringBytes: text.length,
    },
  };
}

const prune = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/**
 * Text for indicator extraction.
 *
 * Plain text decodes directly. Everything else gets `strings` treatment — runs of
 * printable ASCII pulled out of the binary — because an address or URL embedded in an
 * executable is exactly the thing forensics is looking for, and decoding the whole blob
 * as UTF-8 would produce noise instead.
 */
function textOf(buffer, detected) {
  if (detected.type === 'text') return buffer.toString('utf8');
  return extractStrings(buffer);
}

/** Classic `strings`: printable runs of at least `min` characters. */
function extractStrings(buffer, min = 5, cap = 2 * 1024 * 1024) {
  const slice = buffer.subarray(0, cap);
  const runs = [];
  let current = [];

  for (const byte of slice) {
    if (byte >= 0x20 && byte <= 0x7e) {
      current.push(byte);
    } else {
      if (current.length >= min) runs.push(Buffer.from(current).toString('latin1'));
      current = [];
    }
  }
  if (current.length >= min) runs.push(Buffer.from(current).toString('latin1'));
  return runs.join('\n');
}

async function summarise(artifact, text) {
  const indicatorLines = artifact.indicators
    .slice(0, 25)
    .map((i) => `${i.kind}: ${i.value} (x${i.count})`)
    .join('\n');

  return chatText({
    system:
      'You summarise digital forensic artefacts for investigators. Be factual and brief (3-5 sentences). ' +
      'Describe what the file is and what the extracted indicators suggest about it. ' +
      'Do not speculate about criminality, intent or who is responsible. ' +
      'If the extension does not match the detected type, say so plainly — it is significant.',
    user: [
      `Filename: ${artifact.filename}`,
      `Detected type: ${artifact.detectedType} (${artifact.detectedMimeType})`,
      `Extension mismatch: ${artifact.extensionMismatch}`,
      `Size: ${artifact.bytes} bytes`,
      `SHA-256: ${artifact.sha256}`,
      `Metadata: ${JSON.stringify(artifact.metadata).slice(0, 1200)}`,
      indicatorLines ? `Indicators:\n${indicatorLines}` : 'Indicators: none found',
      text ? `\nFirst 3000 characters:\n${text.slice(0, 3000)}` : '',
    ].join('\n'),
    maxTokens: 350,
  });
}

/**
 * Indicators become graph entities linked to the artefact. Everything lands UNVERIFIED —
 * an address appearing in a file is a fact about the file, not about a person.
 */
async function pushToGraph(artifact, caseId) {
  await graphRepo.upsertEntity({
    type: 'Evidence',
    name: artifact.filename,
    caseId,
    attributes: {
      sha256: artifact.sha256,
      detectedType: artifact.detectedType,
      bytes: artifact.bytes,
      source: 'forensics',
    },
  });
  const artifactKey = entityKey('Evidence', artifact.filename);
  let added = 0;

  for (const indicator of artifact.indicators) {
    const type = INDICATOR_ENTITY_TYPE[indicator.kind];
    if (!type) continue;

    await graphRepo.upsertEntity({
      type,
      name: indicator.value,
      caseId,
      attributes: { indicatorKind: indicator.kind, occurrences: indicator.count, source: 'forensics' },
    });
    await graphRepo.upsertRelationship({
      fromKey: entityKey(type, indicator.value),
      toKey: artifactKey,
      type: 'MENTIONED_IN',
      confidence: Math.min(0.5 + indicator.count * 0.1, 0.9),
      status: 'UNVERIFIED',
      evidenceSnippet: `Extracted from ${artifact.filename} (${indicator.count} occurrence${indicator.count === 1 ? '' : 's'}).`,
      extractionMethod: 'forensics',
      createdBy: 'forensics',
    });
    added++;
  }

  return added;
}

export const listForCase = (caseId) =>
  ForensicArtifact.find({ caseId }).sort({ createdAt: -1 }).populate('analysedBy', 'name').lean();

export async function getArtifact(id) {
  const found = await ForensicArtifact.findById(id).populate('analysedBy', 'name').lean();
  if (!found) throw new HttpError(404, 'Artifact not found');
  return found;
}

/** Same bytes seen before? The hash answers it across every case on the instance. */
export const findByHash = (hash) =>
  ForensicArtifact.find({ $or: [{ sha256: hash }, { sha1: hash }, { md5: hash }] })
    .populate('caseId', 'caseNumber title')
    .lean();
