import { Report } from './report.model.js';
import { Case } from '../cases/case.model.js';
import { Evidence } from '../evidence/evidence.model.js';
import { Person } from '../persons/person.model.js';
import { TimelineEvent } from '../timeline/timeline.model.js';
import { BiometricMatch } from '../biometrics/biometric.model.js';
import { ForensicArtifact } from '../forensics/forensic.model.js';
import { getCaseGraph } from '../graph/graph.repository.js';
import { getInfluencers } from '../graph/graph.service.js';
import { detectPatterns } from '../patterns/patterns.service.js';
import { chatText, aiEnabled } from '../../lib/ai/provider.js';
import { HttpError } from '../../middleware/error.js';
import { logger } from '../../lib/logger.js';

export const REPORT_TYPES = ['case_summary', 'network_analysis', 'evidence_register'];

/**
 * Reports are assembled from the record first and narrated second.
 *
 * The fact set below is gathered entirely from stored data — every line is traceable to a
 * document, a graph edge or a database row. The LLM, when configured, only writes prose
 * over that fact set and its output is kept in its own clearly-labelled section. A report
 * generated without an API key is complete and useful; it just has no narrative.
 */
export async function generate({ caseId, type, userId }) {
  if (!REPORT_TYPES.includes(type)) throw new HttpError(400, `Unknown report type: ${type}`);

  const caseDoc = await Case.findById(caseId).populate('assignedUsers', 'name role').lean();
  if (!caseDoc) throw new HttpError(404, 'Case not found');

  const facts = await gatherFacts(caseDoc, type);
  const sections = buildSections(caseDoc, facts, type);

  const report = await Report.create({
    caseId,
    type,
    title: `${TITLES[type]} — ${caseDoc.caseNumber} ${caseDoc.title}`,
    sections,
    factCount: countFacts(sections),
    sourceCount: facts.evidence.length + facts.artifacts.length,
    status: 'draft',
    generatedBy: userId,
    aiNarrative: null,
  });

  if (aiEnabled) {
    report.aiNarrative = await narrate(caseDoc, facts).catch((err) => {
      logger.warn(`report narrative failed: ${err.message}`);
      return null;
    });
    report.aiNarrativeStatus = report.aiNarrative ? 'generated' : 'failed';
  } else {
    report.aiNarrativeStatus = 'unavailable';
  }
  await report.save();

  return report.toObject();
}

const TITLES = {
  case_summary: 'Case summary',
  network_analysis: 'Network analysis',
  evidence_register: 'Evidence register',
};

async function gatherFacts(caseDoc, type) {
  const caseId = caseDoc._id;

  const [evidence, persons, timeline, artifacts, matches, graph] = await Promise.all([
    Evidence.find({ caseId }).sort({ uploadedAt: 1 }).lean(),
    Person.find({ caseIds: caseId }).sort({ name: 1 }).lean(),
    TimelineEvent.find({ caseId }).sort({ occurredAt: 1 }).lean(),
    ForensicArtifact.find({ caseId }).sort({ createdAt: 1 }).lean(),
    BiometricMatch.find({ caseId, reviewStatus: 'confirmed' }).populate('candidatePersonId', 'name').lean(),
    getCaseGraph(caseId).catch(() => ({ nodes: [], edges: [] })),
  ]);

  // Analysis is only fetched where the report type actually uses it.
  let influencers = null;
  let patterns = null;
  if (type !== 'evidence_register') {
    influencers = await getInfluencers(caseId, { limit: 5 }).catch((err) => {
      logger.warn(`report influencers unavailable: ${err.message}`);
      return null;
    });
    patterns = await detectPatterns(caseId).catch(() => null);
  }

  return { evidence, persons, timeline, artifacts, matches, graph, influencers, patterns };
}

function buildSections(caseDoc, facts, type) {
  const sections = [];

  sections.push({
    key: 'facts',
    title: 'Established facts',
    description: 'Drawn directly from the case record. Each line is traceable to stored data.',
    items: [
      fact(`Case ${caseDoc.caseNumber} — ${caseDoc.title}`, 'Case record'),
      fact(`Status ${caseDoc.status}, priority ${caseDoc.priority}, classification ${caseDoc.classification}.`, 'Case record'),
      fact(`Opened ${new Date(caseDoc.createdAt).toISOString().slice(0, 10)}.`, 'Case record'),
      caseDoc.assignedUsers?.length &&
        fact(`Assigned to ${caseDoc.assignedUsers.map((u) => `${u.name} (${u.role})`).join(', ')}.`, 'Case record'),
      fact(`${facts.persons.length} people, ${facts.evidence.length} evidence items and ${facts.timeline.length} timeline events are recorded.`, 'Case record'),
      fact(`The relationship graph holds ${facts.graph.nodes.length} entities and ${facts.graph.edges.length} relationships.`, 'Neo4j graph'),
      ...confirmedRelationshipFacts(facts.graph),
      ...facts.matches.map((m) =>
        fact(
          `Biometric ${m.kind} match to ${m.candidatePersonId?.name} confirmed at score ${m.score.toFixed(4)} (${m.engine}).`,
          'Biometric review',
        ),
      ),
    ].filter(Boolean),
  });

  sections.push({
    key: 'evidence',
    title: 'Evidence relied on',
    description: 'Every item cited by this report, with its integrity hash.',
    items: [
      ...facts.evidence.map((e) =>
        fact(
          `${e.filename} — ${e.processingStatus}${e.chunkCount ? `, ${e.chunkCount} text chunks` : ''}${e.indexed ? ', indexed for search' : ''}.`,
          `sha256 ${e.sha256}`,
        ),
      ),
      ...facts.artifacts.map((a) =>
        fact(
          `${a.filename} — forensic artefact, detected as ${a.detectedType}${a.extensionMismatch ? ' (EXTENSION MISMATCH)' : ''}.`,
          `sha256 ${a.sha256}`,
        ),
      ),
    ],
  });

  if (type !== 'evidence_register') {
    sections.push({
      key: 'findings',
      title: 'Analytical findings',
      description: 'Computed from the graph. Structural observations, not conclusions.',
      items: [
        ...(facts.influencers?.influencers || []).map((i) =>
          fact(
            `${i.name} ranks #${i.rank} by influence (degree ${i.scores.degree}, betweenness ${i.scores.betweenness}, PageRank ${i.scores.pagerank}). ${i.reasons[0]}`,
            'Neo4j GDS centrality',
          ),
        ),
        ...(facts.patterns?.findings || []).map((f) => fact(f.observation, `Pattern rule: ${f.rule}`)),
      ],
    });
  }

  sections.push({
    key: 'open_questions',
    title: 'Open questions',
    description: 'Gaps the record itself exposes. Generated from what is missing, not guessed.',
    items: openQuestions(facts),
  });

  return sections;
}

const fact = (statement, source) => ({ statement, source });

/** Only CONFIRMED edges become report facts — everything else is still a suggestion. */
function confirmedRelationshipFacts(graph) {
  const nameOf = Object.fromEntries(graph.nodes.map((n) => [n.key, n.name]));
  return graph.edges
    .filter((e) => e.status === 'CONFIRMED' && e.relType !== 'MENTIONED_IN')
    .slice(0, 12)
    .map((e) =>
      fact(
        `${nameOf[e.fromKey] || e.fromKey} — ${e.relType.replace(/_/g, ' ').toLowerCase()} — ${nameOf[e.toKey] || e.toKey}.`,
        e.evidenceSnippet ? `Confirmed. ${e.evidenceSnippet}` : 'Confirmed relationship',
      ),
    );
}

function openQuestions(facts) {
  const questions = [];

  const unreviewed = facts.graph.edges.filter((e) => e.status === 'AI_SUGGESTED').length;
  if (unreviewed) {
    questions.push(fact(`${unreviewed} machine-suggested relationships have not been reviewed by a person.`, 'Graph state'));
  }

  const inferred = facts.graph.edges.filter((e) => e.status === 'INFERRED').length;
  if (inferred) {
    questions.push(fact(`${inferred} relationships are inferred rather than evidenced. Each needs corroboration.`, 'Graph state'));
  }

  const failed = facts.evidence.filter((e) => e.processingStatus === 'failed');
  for (const item of failed) {
    questions.push(fact(`${item.filename} failed processing: ${item.processingError}. Its contents are not in the graph.`, 'Processing state'));
  }

  const unindexed = facts.evidence.filter((e) => !e.indexed).length;
  if (unindexed) {
    questions.push(fact(`${unindexed} evidence item(s) are not indexed for search and cannot be cited by the assistant.`, 'Processing state'));
  }

  for (const artifact of facts.artifacts.filter((a) => a.extensionMismatch)) {
    questions.push(fact(`${artifact.filename} claims one file type but its bytes are ${artifact.detectedType}. Unexplained.`, 'Forensic analysis'));
  }

  const noRole = facts.persons.filter((p) => !p.role).length;
  if (noRole) questions.push(fact(`${noRole} recorded person(s) have no assigned role in the case.`, 'Case record'));

  if (!questions.length) {
    questions.push(fact('No structural gaps detected in the current record.', 'Automated check'));
  }
  return questions;
}

const countFacts = (sections) => sections.reduce((n, s) => n + s.items.length, 0);

/** Prose over the fact set. Kept separate and labelled so it is never mistaken for record. */
async function narrate(caseDoc, facts) {
  const influencerLines = (facts.influencers?.influencers || [])
    .map((i) => `- ${i.name}: influence ${i.influenceScore}, betweenness ${i.scores.betweenness}`)
    .join('\n');
  const patternLines = (facts.patterns?.findings || []).map((f) => `- [${f.severity}] ${f.observation}`).join('\n');

  return chatText({
    system:
      'You write the analytical commentary section of an investigative report. ' +
      'Work only from the structured facts supplied. Do not introduce names, dates, amounts or ' +
      'connections that are not present. Do not assert guilt, intent or criminality — describe ' +
      'what the network structure shows and what it does not establish. Note explicitly where ' +
      'the evidence is thin. Four short paragraphs maximum, plain prose, no headings.',
    user: [
      `CASE: ${caseDoc.caseNumber} — ${caseDoc.title}`,
      `Description: ${caseDoc.description || 'none recorded'}`,
      `Graph: ${facts.graph.nodes.length} entities, ${facts.graph.edges.length} relationships.`,
      `Confirmed relationships: ${facts.graph.edges.filter((e) => e.status === 'CONFIRMED').length}`,
      `Unreviewed AI suggestions: ${facts.graph.edges.filter((e) => e.status === 'AI_SUGGESTED').length}`,
      influencerLines ? `\nCentrality ranking:\n${influencerLines}` : '',
      patternLines ? `\nStructural patterns flagged:\n${patternLines}` : '',
      `\nEvidence on file: ${facts.evidence.map((e) => e.filename).join(', ') || 'none'}`,
    ].join('\n'),
    maxTokens: 700,
  });
}

export async function review({ reportId, status, note, user }) {
  const report = await Report.findById(reportId);
  if (!report) throw new HttpError(404, 'Report not found');

  report.status = status;
  report.reviewedBy = user.id;
  report.reviewedAt = new Date();
  report.reviewNote = note;
  await report.save();
  return report.toObject();
}

export const listForCase = (caseId) =>
  Report.find({ caseId })
    .sort({ createdAt: -1 })
    .populate('generatedBy', 'name')
    .populate('reviewedBy', 'name')
    .lean();

export async function getReport(id) {
  const report = await Report.findById(id)
    .populate('generatedBy', 'name role')
    .populate('reviewedBy', 'name role')
    .populate('caseId', 'caseNumber title classification')
    .lean();
  if (!report) throw new HttpError(404, 'Report not found');
  return report;
}

/** Markdown export — plain text, so it survives any downstream tool. */
export async function exportMarkdown(id) {
  const report = await getReport(id);
  const lines = [
    `# ${report.title}`,
    '',
    `**Classification:** ${report.caseId?.classification || 'unclassified'}  `,
    `**Status:** ${report.status}  `,
    `**Generated:** ${new Date(report.createdAt).toISOString()} by ${report.generatedBy?.name || 'system'}  `,
    report.reviewedBy ? `**Reviewed:** ${new Date(report.reviewedAt).toISOString()} by ${report.reviewedBy.name}  ` : null,
    '',
    '> Generated by Chanakya from the stored case record. Every statement below is traceable',
    '> to the source named beside it. Sections are separated so that recorded fact is never',
    '> presented as analysis, and analysis is never presented as conclusion.',
    '',
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`, '', `_${section.description}_`, '');
    if (!section.items.length) lines.push('_Nothing recorded._', '');
    for (const item of section.items) lines.push(`- ${item.statement}`, `  - Source: ${item.source}`);
    lines.push('');
  }

  if (report.aiNarrative) {
    lines.push(
      '## AI observations',
      '',
      '_Written by a language model over the fact set above. Not evidence, and not reviewed unless this report is marked reviewed._',
      '',
      report.aiNarrative,
      '',
    );
  } else {
    lines.push('## AI observations', '', `_Not generated (${report.aiNarrativeStatus}). The report above is complete without it._`, '');
  }

  // Drop only the omitted conditional lines — blank strings are intentional Markdown
  // spacing, and stripping them breaks list and heading rendering.
  return {
    filename: `${report.title.replace(/[^\w-]+/g, '_')}.md`,
    markdown: lines.filter((line) => line !== null && line !== undefined).join('\n'),
  };
}
