import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'demo-records.json'), 'utf8'),
);

/**
 * A stand-in for a public corporate/registry source.
 *
 * The records are FICTIONAL and shipped with the app — this connector demonstrates the
 * framework (selector matching, normalisation, entity resolution, graph write) without
 * calling any third party. Swapping in a real permitted API means replacing `search()`;
 * everything downstream is unchanged.
 */
export const demoRegistry = {
  id: 'demo-registry',
  name: 'Public registry (demo)',
  description: 'Fictional corporate, professional and property filings shipped with the prototype.',
  dataSource: 'Bundled fictional dataset',
  kinds: ['name', 'email', 'phone', 'company'],

  async search({ query, kind }) {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];

    return DATA.records
      .filter((record) => matches(record, term, kind))
      .slice(0, 15)
      .map((record) => ({
        sourceId: record.id,
        title: record.name,
        kind: record.kind,
        confidence: exactName(record, term) ? 0.9 : 0.6,
        attributes: prune({
          role: record.role,
          company: record.company,
          email: record.email,
          phone: record.phone,
          address: record.address,
          incorporated: record.incorporated,
          appointed: record.appointed,
          aliases: record.aliases?.join(', '),
          filing: record.filing,
        }),
        // What this record would contribute to the graph if accepted.
        entities: [
          { type: 'Person', name: record.name },
          record.company && { type: 'Organization', name: record.company },
          record.email && { type: 'Email', name: record.email },
          record.phone && { type: 'Phone', name: record.phone },
        ].filter(Boolean),
        relationships: record.company
          ? [{ from: record.name, to: record.company, type: 'ASSOCIATED_WITH' }]
          : [],
        note: record.note,
      }));
  },
};

function matches(record, term, kind) {
  const haystacks = {
    name: [record.name, ...(record.aliases || [])],
    email: [record.email],
    phone: [record.phone],
    company: [record.company],
  };
  const fields = kind && haystacks[kind] ? haystacks[kind] : Object.values(haystacks).flat();
  return fields.filter(Boolean).some((field) => String(field).toLowerCase().includes(term));
}

const exactName = (record, term) =>
  [record.name, ...(record.aliases || [])].filter(Boolean).some((n) => n.toLowerCase() === term);

const prune = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v));

export const DEMO_NOTICE = DATA._notice;
