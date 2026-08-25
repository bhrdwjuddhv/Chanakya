import crypto from 'node:crypto';
import { Evidence } from './evidence.model.js';
import { extractText, isTextExtractable } from './textExtract.js';
import { chunkText } from '../../lib/ai/chunk.js';
import { extractEntities, summarizeEvidence } from '../../lib/ai/extraction.js';
import { embed, aiEnabled, EMBED_DIM } from '../../lib/ai/provider.js';
import { ensureCollection, upsertPoints, deleteByCase } from '../../lib/qdrant.js';
import { saveFile, readFile } from '../../lib/storage.js';
import { sha256 } from '../../lib/crypto.js';
import { logger } from '../../lib/logger.js';
import { HttpError } from '../../middleware/error.js';
import * as graphRepo from '../graph/graph.repository.js';
import { entityKey } from '../graph/graph.constants.js';

export async function uploadEvidence({ file, caseId, userId, type }) {
  const digest = sha256(file.buffer);
  const duplicate = await Evidence.findOne({ caseId, sha256: digest }).lean();
  if (duplicate) throw new HttpError(409, `Identical file already on this case: ${duplicate.filename}`);

  const { storageUrl } = await saveFile(file.buffer, file.originalname);
  const evidence = await Evidence.create({
    caseId,
    filename: file.originalname,
    type: type || guessType(file.originalname, file.mimetype),
    storageUrl,
    mimeType: file.mimetype,
    bytes: file.size,
    sha256: digest,
    uploadedBy: userId,
    processingStatus: 'queued',
    processingStep: 'Queued for processing',
  });

  // ponytail: processed in-process, not on a job queue. The client polls
  // processingStatus. Move to a worker when uploads outpace one server.
  processEvidence(evidence._id).catch((err) => logger.error(`processing crashed: ${err.message}`));

  return evidence.toObject();
}

function guessType(filename, mimeType) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'bmp', 'tif'].includes(ext)) return 'image';
  if (mimeType?.startsWith('audio/')) return 'audio';
  if (mimeType?.startsWith('video/')) return 'video';
  return isTextExtractable(filename, mimeType) ? 'document' : 'other';
}

/** The whole document pipeline. Every step writes processingStep so the UI can show it live. */
export async function processEvidence(evidenceId) {
  const evidence = await Evidence.findById(evidenceId);
  if (!evidence) return;

  const step = (processingStep) =>
    Evidence.updateOne({ _id: evidenceId }, { processingStatus: 'processing', processingStep });

  try {
    await step('Extracting text');
    if (!isTextExtractable(evidence.filename, evidence.mimeType)) {
      await Evidence.updateOne(
        { _id: evidenceId },
        {
          processingStatus: 'completed',
          processingStep: 'Stored — not a text document, no extraction run',
          processingError: null,
        },
      );
      return;
    }

    const buffer = await readFile(evidence.storageUrl);
    const text = await extractText(buffer, { mimeType: evidence.mimeType, filename: evidence.filename });
    if (!text.trim()) throw new Error('No readable text found in this file');

    const chunks = chunkText(text);
    await Evidence.updateOne({ _id: evidenceId }, { textLength: text.length, chunkCount: chunks.length });

    if (!aiEnabled) {
      await Evidence.updateOne(
        { _id: evidenceId },
        {
          processingStatus: 'completed',
          processingStep: `Text extracted (${chunks.length} chunks). AI disabled — set OPENAI_API_KEY for entity extraction and search.`,
          processingError: null,
        },
      );
      return;
    }

    await step(`Embedding ${chunks.length} chunks`);
    await indexChunks(evidence, chunks);
    await Evidence.updateOne({ _id: evidenceId }, { indexed: true });

    await step('Extracting entities and relationships');
    const extracted = await extractEntities(chunks);

    await step(`Writing ${extracted.entities.length} entities to the graph`);
    await writeToGraph(evidence, extracted);

    await step('Summarising');
    const aiSummary = await summarizeEvidence(text, evidence.filename).catch(() => null);

    await Evidence.updateOne(
      { _id: evidenceId },
      {
        processingStatus: 'completed',
        processingStep: 'Completed',
        // A successful reprocess must clear the previous failure, or the UI keeps
        // showing an error for a document that is now fine.
        processingError: null,
        aiSummary,
        extractedEntities: extracted.entities.map((e) => ({
          name: e.name,
          type: e.type,
          confidence: e.confidence,
        })),
      },
    );
    logger.info(`processed ${evidence.filename}: ${extracted.entities.length} entities, ${extracted.relationships.length} relationships`);
  } catch (err) {
    logger.error(`processing failed for ${evidenceId}: ${err.message}`);
    await Evidence.updateOne(
      { _id: evidenceId },
      { processingStatus: 'failed', processingStep: 'Failed', processingError: err.message },
    );
  }
}

async function indexChunks(evidence, chunks) {
  await ensureCollection(EMBED_DIM);
  const vectors = await embed(chunks.map((c) => c.content));
  await upsertPoints(
    chunks.map((chunk, i) => ({
      id: pointId(evidence._id, chunk.chunkId),
      vector: vectors[i],
      payload: {
        caseId: String(evidence.caseId),
        evidenceId: String(evidence._id),
        chunkId: chunk.chunkId,
        pageNumber: chunk.pageNumber,
        content: chunk.content,
        sourceName: evidence.filename,
      },
    })),
  );
}

// Qdrant ids must be uint or UUID; derive a stable one so re-processing overwrites.
function pointId(evidenceId, chunkId) {
  const hex = crypto.createHash('md5').update(`${evidenceId}:${chunkId}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Everything the LLM produced lands as AI_SUGGESTED. A human promotes it, never the machine. */
async function writeToGraph(evidence, { entities, relationships }) {
  const keyByTempId = {};

  for (const entity of entities) {
    await graphRepo.upsertEntity({
      type: entity.type,
      name: entity.name,
      caseId: evidence.caseId,
      attributes: { ...entity.attributes, extractedFrom: evidence.filename },
      aliases: entity.attributes?.alias ? [String(entity.attributes.alias)] : [],
    });
    keyByTempId[entity.tempId] = entityKey(entity.type, entity.name);
  }

  // The evidence file itself is a node, so entities stay traceable to their source.
  await graphRepo.upsertEntity({
    type: 'Evidence',
    name: evidence.filename,
    caseId: evidence.caseId,
    attributes: { evidenceId: String(evidence._id), sha256: evidence.sha256 },
  });
  const evidenceNodeKey = entityKey('Evidence', evidence.filename);

  for (const entity of entities) {
    await graphRepo.upsertRelationship({
      fromKey: keyByTempId[entity.tempId],
      toKey: evidenceNodeKey,
      type: 'MENTIONED_IN',
      confidence: entity.confidence,
      status: 'CONFIRMED', // the mention is a fact about the file, not an inference
      sourceEvidenceIds: [evidence._id],
      extractionMethod: 'llm',
    });
  }

  for (const rel of relationships) {
    const fromKey = keyByTempId[rel.fromTempId];
    const toKey = keyByTempId[rel.toTempId];
    if (!fromKey || !toKey || fromKey === toKey) continue;
    await graphRepo.upsertRelationship({
      fromKey,
      toKey,
      type: rel.type,
      confidence: rel.confidence,
      status: 'AI_SUGGESTED',
      sourceEvidenceIds: [evidence._id],
      evidenceSnippet: rel.evidenceSnippet,
      extractionMethod: 'llm',
    });
  }
}

export const listEvidence = (caseId) =>
  Evidence.find({ caseId }).sort({ uploadedAt: -1 }).populate('uploadedBy', 'name').lean();

export async function getEvidence(id) {
  const found = await Evidence.findById(id).populate('uploadedBy', 'name').lean();
  if (!found) throw new HttpError(404, 'Evidence not found');
  return found;
}

/** Full text on demand — the citation viewer needs it to highlight a snippet. */
export async function getEvidenceText(id) {
  const evidence = await getEvidence(id);
  if (!isTextExtractable(evidence.filename, evidence.mimeType)) {
    throw new HttpError(400, 'This evidence has no extractable text');
  }
  const buffer = await readFile(evidence.storageUrl);
  return {
    filename: evidence.filename,
    text: await extractText(buffer, { mimeType: evidence.mimeType, filename: evidence.filename }),
  };
}

export async function deleteEvidence(id) {
  const found = await Evidence.findByIdAndDelete(id);
  if (!found) throw new HttpError(404, 'Evidence not found');
  return { deleted: true };
}

export const purgeCaseVectors = deleteByCase;
