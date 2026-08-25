import { detectPatterns } from './patterns.service.js';
import * as audit from '../audit/audit.service.js';

export async function list(req, res) {
  const result = await detectPatterns(req.params.caseId);
  await audit.record(req, 'RUN_PATTERN_DETECTION', {
    resourceType: 'case',
    caseId: req.params.caseId,
    metadata: { findings: result.findings.length },
  });
  res.json(result);
}
