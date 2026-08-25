/**
 * Indicator-of-compromise / selector extraction from text.
 *
 * Deliberately conservative: a false positive here becomes a node in the case graph, so
 * each pattern is anchored and obvious non-indicators are filtered out afterwards. Every
 * hit is a literal substring of the source — nothing is inferred.
 */

const PATTERNS = {
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g,
  email: /\b[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  url: /\bhttps?:\/\/[^\s<>"')\]]+/gi,
  // Phone: international or grouped forms, at least 7 digits.
  phone: /(?:\+\d{1,3}[-.\s]?)?(?:\(\d{2,4}\)[-.\s]?)?\d{3,4}[-.\s]\d{3,4}(?:[-.\s]\d{3,4})?/g,
  btc: /\b(?:bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g,
  hash: /\b(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/gi,
  filepath: /\b[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*/g,
};

// Domains are derived from urls/emails rather than matched directly — a bare regex for
// "word.word" flags every sentence that runs into a filename.
const domainOf = (value) => {
  try {
    return new URL(value).hostname;
  } catch {
    return value.split('@')[1] || null;
  }
};

export function extractIndicators(text, { limitPerKind = 40 } = {}) {
  if (!text) return [];
  const found = {};

  for (const [kind, pattern] of Object.entries(PATTERNS)) {
    const counts = new Map();
    for (const match of text.matchAll(pattern)) {
      const value = match[0].trim().replace(/[.,;:)\]]+$/, '');
      if (!isPlausible(kind, value)) continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    if (counts.size) found[kind] = counts;
  }

  const domains = new Map();
  for (const kind of ['url', 'email']) {
    for (const value of found[kind]?.keys() || []) {
      const host = domainOf(value);
      if (host) domains.set(host, (domains.get(host) || 0) + 1);
    }
  }
  if (domains.size) found.domain = domains;

  return Object.entries(found).flatMap(([kind, counts]) =>
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitPerKind)
      .map(([value, count]) => ({ kind, value, count })),
  );
}

function isPlausible(kind, value) {
  if (kind === 'ipv4') {
    // Version strings and dotted decimals masquerade as addresses.
    const parts = value.split('.').map(Number);
    if (parts.every((p) => p === 0)) return false;
    if (parts[0] === 0 || parts[0] === 255) return false;
    return true;
  }
  if (kind === 'phone') {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }
  if (kind === 'hash') {
    // A run of hex that is really a date or an id is common; require mixed characters.
    return /[a-f]/i.test(value) && /\d/.test(value);
  }
  return value.length > 3;
}

/**
 * Maps an indicator to the graph entity type it should become, or null when it is
 * evidence-level detail that does not belong in the relationship graph.
 */
export const INDICATOR_ENTITY_TYPE = {
  email: 'Email',
  phone: 'Phone',
  domain: 'Organization',
  url: null,
  ipv4: null,
  btc: null,
  hash: null,
  filepath: null,
};
