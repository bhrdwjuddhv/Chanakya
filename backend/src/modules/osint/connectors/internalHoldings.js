import { Person } from '../../persons/person.model.js';
import { run } from '../../../lib/neo4j.js';

/**
 * Searches what this instance already holds. In a real unit this is the first question
 * asked of any new selector — "do we know this already?" — and it is the one source that
 * is unambiguously ours to query.
 */
export const internalHoldings = {
  id: 'internal-holdings',
  name: 'Internal holdings',
  description: 'People and graph entities already recorded on this instance.',
  dataSource: 'This platform',
  kinds: ['name', 'email', 'phone', 'username'],

  async search({ query }) {
    const term = query.trim();
    if (term.length < 2) return [];

    const [people, entities] = await Promise.all([
      Person.find({
        $or: [{ name: new RegExp(escape(term), 'i') }, { aliases: new RegExp(escape(term), 'i') }],
      })
        .limit(10)
        .populate('caseIds', 'caseNumber title')
        .lean(),
      run(
        `MATCH (n:Entity) WHERE toLower(n.name) CONTAINS toLower($term)
         OPTIONAL MATCH (n)-[:PART_OF_CASE]->(c:Case)
         RETURN n.name AS name, n.type AS type, n.key AS key,
                collect(DISTINCT c.caseNumber) AS cases
         LIMIT 10`,
        { term },
      ).catch(() => []),
    ]);

    const records = people.map((person) => ({
      sourceId: String(person._id),
      title: person.name,
      kind: 'person',
      confidence: 0.95,
      attributes: {
        role: person.role,
        aliases: person.aliases?.join(', '),
        cases: person.caseIds?.map((c) => c.caseNumber).join(', '),
      },
      entities: [{ type: 'Person', name: person.name }],
      note: person.caseIds?.length
        ? `Already on ${person.caseIds.length} case(s): ${person.caseIds.map((c) => c.title).join('; ')}`
        : 'On file, not yet attached to a case.',
    }));

    for (const entity of entities) {
      if (entity.type === 'Person' && records.some((r) => r.title === entity.name)) continue;
      records.push({
        sourceId: entity.key,
        title: entity.name,
        kind: 'graph-entity',
        confidence: 0.9,
        attributes: { type: entity.type, cases: entity.cases.filter(Boolean).join(', ') },
        entities: [{ type: entity.type, name: entity.name }],
        note: entity.cases.filter(Boolean).length
          ? `Graph entity on ${entity.cases.filter(Boolean).join(', ')}`
          : 'Graph entity, no case attachment.',
      });
    }

    return records;
  },
};

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
