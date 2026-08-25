import * as reportService from './report.service.js';
import * as audit from '../audit/audit.service.js';

export async function generate(req, res) {
  const report = await reportService.generate({
    caseId: req.params.caseId,
    type: req.body.type,
    userId: req.user.id,
  });
  await audit.record(req, 'GENERATE_REPORT', {
    resourceType: 'report',
    resourceId: report._id,
    caseId: req.params.caseId,
    metadata: { type: report.type, facts: report.factCount, narrative: report.aiNarrativeStatus },
  });
  res.status(201).json({ report });
}

export async function list(req, res) {
  res.json({ reports: await reportService.listForCase(req.params.caseId) });
}

export async function get(req, res) {
  res.json({ report: await reportService.getReport(req.params.id) });
}

export async function review(req, res) {
  const report = await reportService.review({
    reportId: req.params.id,
    status: req.body.status,
    note: req.body.note,
    user: req.user,
  });
  await audit.record(req, 'REVIEW_REPORT', {
    resourceType: 'report',
    resourceId: report._id,
    caseId: report.caseId,
    metadata: { status: report.status },
  });
  res.json({ report });
}

export async function exportMarkdown(req, res) {
  const { filename, markdown } = await reportService.exportMarkdown(req.params.id);
  await audit.record(req, 'EXPORT_REPORT', { resourceType: 'report', resourceId: req.params.id });
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(markdown);
}
