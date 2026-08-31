import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

import { connectMongo, mongoose } from '../lib/mongoose.js';
import { connectNeo4j, run, closeNeo4j } from '../lib/neo4j.js';
import { ensureCollection, dropCollection, upsertPoints } from '../lib/qdrant.js';
import { embed, aiEnabled, EMBED_DIM } from '../lib/ai/provider.js';
import { chunkText } from '../lib/ai/chunk.js';
import { sha256 } from '../lib/crypto.js';
import { saveFile } from '../lib/storage.js';
import { logger } from '../lib/logger.js';

import { User } from '../modules/auth/user.model.js';
import { Case } from '../modules/cases/case.model.js';
import { Person } from '../modules/persons/person.model.js';
import { Evidence } from '../modules/evidence/evidence.model.js';
import { TimelineEvent } from '../modules/timeline/timeline.model.js';
import { Location } from '../modules/locations/location.model.js';
import { AuditLog } from '../modules/audit/audit.model.js';
import * as graphRepo from '../modules/graph/graph.repository.js';
import { entityKey } from '../modules/graph/graph.constants.js';

import { enrollReferenceGallery } from '../modules/biometrics/face.service.js';
import { enrollReferenceGallery as enrollPrints } from '../modules/biometrics/fingerprint.service.js';
import { FaceEnrollment, BiometricMatch, FingerprintTemplate } from '../modules/biometrics/biometric.model.js';

import { seedCases, seedUsers } from './mock-data/cases.js';

const DOCS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'mock-data/documents');

// Which seeded documents belong to which case, and a hand-written summary so the
// evidence list is populated even when no AI key is configured.
const DOCUMENTS = {
  'CASE-2025-001': [
    { file: 'harbor-shadow-surveillance-log.txt', summary: 'Consolidated surveillance covering seven container diversions at JNPT CFS Yard 4. Places Devendra Shukla at the loading bay, links container truck MH-06-BW-4417 to the Kalamboli Scrap Yard, and assesses Vikramaditya Singhania as the coordinating kingpin on positional intelligence.' },
    { file: 'harbor-shadow-interview-nguyen.txt', summary: 'Statement under Sec 161 CrPC of night-shift clerk Tanmay Nambiar. Admits two meetings with Devendra Shukla and links Shukla to Singhania Multi-Modal. Denies knowledge of container tampering.' },
  ],
  'CASE-2025-002': [
    { file: 'riverfront-missing-person-report.txt', summary: 'Consolidated missing person narrative for Dr. Ananya Sen. Documents her 18:52 lab exit, the 19:10 sighting by Sunita Aggarwal at Pari Chowk, the 19:26 handset blackout, and an unexplained "V. Singhania" visitor entry connected to Singhania Multi-Modal.' },
    { file: 'riverfront-witness-statement-alvarez.txt', summary: 'Statement of Sunita Aggarwal, the last person to see Dr. Sen. Places her on the Yamuna Expressway service road at 19:10, walking east and on the phone. Timing corroborated by smartwatch GPS export.' },
  ],
  'CASE-2025-003': [
    { file: 'ledger-glass-audit-memo.txt', summary: 'Vigilance audit memo by Gita Trivedi. Records that unrelated contractors all transfer kickbacks to Kanch Consultancy Services LLP, whose sole partner is Isha Deshmukh and whose registered address is a virtual mail suite.' },
    { file: 'ledger-glass-call-data-analysis.txt', summary: 'CDR telecom summary. The municipal procurement officers and private contractors never contact each other directly; both contact Isha Deshmukh (+91-98100-55288), the sole communication bridge between them.' },
  ],
};

async function main() {
  await connectMongo();
  await connectNeo4j();

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed with NODE_ENV=production — this wipes data.');
  }

  logger.info('resetting dev data...');
  await Promise.all(
    [User, Case, Person, Evidence, TimelineEvent, Location, AuditLog, FaceEnrollment, BiometricMatch, FingerprintTemplate].map((m) => m.deleteMany({})),
  );
  await run('MATCH (n) DETACH DELETE n');
  await dropCollection();
  await ensureCollection(EMBED_DIM).catch((err) => logger.warn(`qdrant: ${err.message}`));

  // --- users -----------------------------------------------------------------
  const users = await User.insertMany(
    await Promise.all(
      seedUsers.map(async (u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash: await bcrypt.hash(u.password, 10),
      })),
    ),
  );
  const byRole = Object.fromEntries(users.map((u) => [u.role, u]));
  logger.info(`created ${users.length} users`);

  // --- cases -----------------------------------------------------------------
  let entityCount = 0;
  let relCount = 0;

  for (const data of seedCases) {
    const created = await Case.create({
      caseNumber: data.caseNumber,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      classification: data.classification,
      assignedUsers: [byRole.investigator._id, byRole.supervisor._id],
      createdBy: byRole.supervisor._id,
    });
    const caseId = String(created._id);

    await run(
      `MERGE (c:Case {caseId: $caseId})
       SET c.title = $title, c.caseNumber = $caseNumber, c.status = $status, c.createdAt = datetime()`,
      { caseId, title: data.title, caseNumber: data.caseNumber, status: data.status },
    );

    // Entities. entityKey is global, so Marcus Vale seeded on two cases is one node
    // attached to both — that is what makes the cross-case bridge pattern real.
    const keyByName = {};
    for (const entity of data.entities) {
      await graphRepo.upsertEntity({
        type: entity.type,
        name: entity.name,
        caseId,
        // role travels onto the node so pattern rules can ask "is this a named suspect?"
        attributes: { ...(entity.attributes || {}), ...(entity.role ? { role: entity.role } : {}) },
        aliases: entity.aliases || [],
      });
      keyByName[entity.name] = entityKey(entity.type, entity.name);
      entityCount++;
    }

    for (const rel of data.relationships) {
      const fromKey = keyByName[rel.from];
      const toKey = keyByName[rel.to];
      if (!fromKey || !toKey) {
        logger.warn(`${data.caseNumber}: relationship references unknown entity ${rel.from} -> ${rel.to}`);
        continue;
      }
      await graphRepo.upsertRelationship({
        fromKey,
        toKey,
        type: rel.type,
        confidence: rel.confidence,
        status: rel.status,
        evidenceSnippet: rel.snippet,
        extractionMethod: rel.status === 'AI_SUGGESTED' ? 'llm' : 'case_file',
        createdBy: 'seed',
      });
      relCount++;
    }

    // Persons in Mongo mirror the :Person nodes, joined on graphKey.
    const personDocs = data.entities
      .filter((e) => e.type === 'Person')
      .map((e) => ({
        name: e.name,
        aliases: e.aliases || [],
        role: e.role,
        notes: e.attributes?.note,
        caseIds: [created._id],
        graphKey: keyByName[e.name],
      }));
    for (const person of personDocs) {
      await Person.updateOne(
        { graphKey: person.graphKey },
        { $set: { ...person, caseIds: undefined }, $addToSet: { caseIds: created._id } },
        { upsert: true },
      );
    }

    // Locations
    const locations = await Location.insertMany(
      data.locations.map((l) => ({ ...l, caseId: created._id })),
    );
    const locationByName = Object.fromEntries(locations.map((l) => [l.name, l._id]));

    // Evidence + RAG index
    const evidenceByFile = {};
    for (const doc of DOCUMENTS[data.caseNumber] || []) {
      const evidence = await seedDocument(doc, created, byRole.investigator._id);
      evidenceByFile[doc.file] = evidence._id;
    }

    // Timeline
    const personIdByName = Object.fromEntries(
      (await Person.find({ caseIds: created._id }).lean()).map((p) => [p.name, p._id]),
    );
    await TimelineEvent.insertMany(
      data.timeline.map((event) => ({
        caseId: created._id,
        occurredAt: new Date(event.occurredAt),
        title: event.title,
        description: event.description,
        type: event.type,
        source: event.source,
        personIds: (event.persons || []).map((n) => personIdByName[n]).filter(Boolean),
        locationId: locationByName[event.location],
      })),
    );

    logger.info(
      `${data.caseNumber} ${data.title}: ${data.entities.length} entities, ${data.relationships.length} relationships, ${data.timeline.length} timeline events`,
    );
  }

  // Seed a little audit history so the audit view is not empty on first boot.
  await AuditLog.insertMany(
    users.map((u) => ({
      userId: u._id,
      userName: u.name,
      role: u.role,
      action: 'SEED_ACCOUNT_CREATED',
      resourceType: 'user',
      resourceId: String(u._id),
    })),
  );

  // Real enrolment against InsightFace, so 1:N search works on first boot.
  logger.info('enrolling face reference gallery...');
  const faces = await enrollReferenceGallery();
  if (faces.skipped) logger.warn(`face gallery skipped — ${faces.reason}`);
  else {
    for (const row of faces.report) {
      if (row.error) logger.warn(`  ${row.slug}: ${row.error}`);
    }
    logger.info(`enrolled ${faces.report.filter((r) => r.enrolled).length} faces`);
  }

  logger.info('enrolling fingerprint reference gallery...');
  const prints = await enrollPrints();
  if (prints.skipped) logger.warn(`fingerprint gallery skipped — ${prints.reason}`);
  else logger.info(`enrolled ${prints.report.reduce((n, r) => n + (r.enrolled || 0), 0)} fingerprints`);

  printSummary({ entityCount, relCount, faces, prints });
}

async function seedDocument(doc, caseDoc, uploadedBy) {
  const buffer = await fs.readFile(path.join(DOCS_DIR, doc.file));
  const { storageUrl } = await saveFile(buffer, doc.file);
  const text = buffer.toString('utf8');
  const chunks = chunkText(text);

  const evidence = await Evidence.create({
    caseId: caseDoc._id,
    filename: doc.file,
    type: 'document',
    storageUrl,
    mimeType: 'text/plain',
    bytes: buffer.length,
    sha256: sha256(buffer),
    uploadedBy,
    processingStatus: 'completed',
    processingStep: 'Completed',
    textLength: text.length,
    chunkCount: chunks.length,
    aiSummary: doc.summary,
  });

  if (aiEnabled) {
    try {
      const vectors = await embed(chunks.map((c) => c.content));
      await upsertPoints(
        chunks.map((chunk, i) => ({
          id: chunkPointId(evidence._id, chunk.chunkId),
          vector: vectors[i],
          payload: {
            caseId: String(caseDoc._id),
            evidenceId: String(evidence._id),
            chunkId: chunk.chunkId,
            pageNumber: chunk.pageNumber,
            content: chunk.content,
            sourceName: doc.file,
          },
        })),
      );
      await Evidence.updateOne({ _id: evidence._id }, { indexed: true });
    } catch (err) {
      logger.warn(`could not index ${doc.file} for search: ${err.message}`);
    }
  }

  // The evidence file is a graph node too, so citations and the graph line up.
  await graphRepo.upsertEntity({
    type: 'Evidence',
    name: doc.file,
    caseId: caseDoc._id,
    attributes: { evidenceId: String(evidence._id), sha256: evidence.sha256 },
  });

  return evidence;
}

function chunkPointId(evidenceId, chunkId) {
  const hex = sha256(Buffer.from(`${evidenceId}:${chunkId}`)).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function printSummary({ entityCount, relCount, faces, prints }) {
  const line = '─'.repeat(64);
  console.log(`\n${line}`);
  console.log('  SEED COMPLETE');
  console.log(line);
  console.log(`  ${seedCases.length} cases · ${entityCount} graph entities · ${relCount} relationships`);
  if (faces?.skipped) {
    console.log(`  Face gallery not enrolled — ${faces.reason}`);
  } else if (faces) {
    console.log(`  ${faces.report.filter((r) => r.enrolled).length} faces enrolled for 1:N search`);
  }
  if (prints?.skipped) {
    console.log(`  Fingerprints not enrolled — ${prints.reason}`);
  } else if (prints) {
    console.log(`  ${prints.report.reduce((n, r) => n + (r.enrolled || 0), 0)} fingerprints enrolled`);
  }
  if (!aiEnabled) {
    console.log('  AI disabled (no OPENAI_API_KEY) — documents stored but not indexed for search.');
  }
  console.log(`\n  DEV LOGINS (development only — never use these in production)\n`);
  for (const u of seedUsers) {
    console.log(`    ${u.role.padEnd(13)} ${u.email.padEnd(26)} ${u.password}`);
  }
  console.log(`\n${line}\n`);
}

main()
  .catch((err) => {
    logger.error(err.stack || err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    await closeNeo4j();
  });
