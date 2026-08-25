import { Case } from './case.model.js';
import { Evidence } from '../evidence/evidence.model.js';
import { Person } from '../persons/person.model.js';
import { TimelineEvent } from '../timeline/timeline.model.js';
import { Location } from '../locations/location.model.js';
import { HttpError } from '../../middleware/error.js';
import { run } from '../../lib/neo4j.js';
import { logger } from '../../lib/logger.js';

export async function listCases({ status, priority, q } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (q) filter.$or = [{ title: new RegExp(q, 'i') }, { caseNumber: new RegExp(q, 'i') }];

  const cases = await Case.find(filter).sort({ updatedAt: -1 }).populate('assignedUsers', 'name role').lean();
  const counts = await Evidence.aggregate([{ $group: { _id: '$caseId', n: { $sum: 1 } } }]);
  const byCase = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  return cases.map((c) => ({ ...c, evidenceCount: byCase[String(c._id)] || 0 }));
}

export async function getCase(id) {
  const found = await Case.findById(id).populate('assignedUsers', 'name email role').lean();
  if (!found) throw new HttpError(404, 'Case not found');

  const [evidenceCount, personCount, timelineCount, locationCount, graph] = await Promise.all([
    Evidence.countDocuments({ caseId: id }),
    Person.countDocuments({ caseIds: id }),
    TimelineEvent.countDocuments({ caseId: id }),
    Location.countDocuments({ caseId: id }),
    graphCounts(id),
  ]);

  return { ...found, stats: { evidenceCount, personCount, timelineCount, locationCount, ...graph } };
}

/** Neo4j may be down while Mongo is fine — degrade instead of 500ing the case page. */
async function graphCounts(caseId) {
  try {
    const [row] = await run(
      `MATCH (c:Case {caseId: $caseId})<-[:PART_OF_CASE]-(n)
       OPTIONAL MATCH (n)-[r]-(m)-[:PART_OF_CASE]->(c)
       RETURN count(DISTINCT n) AS nodeCount, count(DISTINCT r) AS relationshipCount`,
      { caseId: String(caseId) },
    );
    return { nodeCount: row?.nodeCount || 0, relationshipCount: row?.relationshipCount || 0 };
  } catch (err) {
    logger.warn(`graph counts unavailable: ${err.message}`);
    return { nodeCount: null, relationshipCount: null };
  }
}

export async function createCase(data, userId) {
  const caseNumber = data.caseNumber || (await nextCaseNumber());
  if (await Case.exists({ caseNumber })) throw new HttpError(409, `Case ${caseNumber} already exists`);
  const created = await Case.create({ ...data, caseNumber, createdBy: userId });

  await run(
    `MERGE (c:Case {caseId: $caseId})
     SET c.title = $title, c.caseNumber = $caseNumber, c.status = $status, c.createdAt = datetime()`,
    { caseId: String(created._id), title: created.title, caseNumber, status: created.status },
  ).catch((err) => logger.warn(`case node not created: ${err.message}`));

  return created.toObject();
}

async function nextCaseNumber() {
  const year = new Date().getFullYear();
  const count = await Case.countDocuments({ caseNumber: new RegExp(`^CASE-${year}-`) });
  return `CASE-${year}-${String(count + 1).padStart(3, '0')}`;
}

export async function updateCase(id, data) {
  const updated = await Case.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  if (!updated) throw new HttpError(404, 'Case not found');
  return updated;
}

export async function deleteCase(id) {
  const found = await Case.findByIdAndDelete(id);
  if (!found) throw new HttpError(404, 'Case not found');
  return { deleted: true };
}

export async function dashboardStats() {
  const [byStatus, byPriority, totalCases, totalEvidence, totalPersons, recent] = await Promise.all([
    Case.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Case.aggregate([{ $group: { _id: '$priority', n: { $sum: 1 } } }]),
    Case.countDocuments(),
    Evidence.countDocuments(),
    Person.countDocuments(),
    Case.find().sort({ updatedAt: -1 }).limit(5).lean(),
  ]);

  return {
    totalCases,
    totalEvidence,
    totalPersons,
    pendingProcessing: await Evidence.countDocuments({ processingStatus: { $in: ['queued', 'processing'] } }),
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
    byPriority: Object.fromEntries(byPriority.map((p) => [p._id, p.n])),
    recentCases: recent,
  };
}
