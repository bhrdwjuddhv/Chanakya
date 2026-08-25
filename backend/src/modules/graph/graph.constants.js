// Labels and relationship types are interpolated into Cypher (Neo4j can't parameterise
// them), so they must only ever come from these frozen whitelists.
export const ENTITY_TYPES = [
  'Person',
  'Organization',
  'Location',
  'Vehicle',
  'Phone',
  'Email',
  'Document',
  'Evidence',
  'Event',
];

export const RELATIONSHIP_TYPES = [
  'KNOWS',
  'ASSOCIATED_WITH',
  'OWNS',
  'LOCATED_AT',
  'VISITED',
  'USED',
  'MENTIONED_IN',
  'SUSPECT_IN',
  'VICTIM_IN',
  'EVIDENCE_FOR',
  'PART_OF_CASE',
  'MATCHED_BY',
];

export const RELATIONSHIP_STATUS = ['CONFIRMED', 'INFERRED', 'AI_SUGGESTED', 'UNVERIFIED'];

export const assertEntityType = (type) => {
  if (!ENTITY_TYPES.includes(type)) throw new Error(`Unknown entity type: ${type}`);
  return type;
};

export const assertRelType = (type) => {
  if (!RELATIONSHIP_TYPES.includes(type)) throw new Error(`Unknown relationship type: ${type}`);
  return type;
};

/** Stable dedupe key so the same person from two documents is one node. */
export const entityKey = (type, name) =>
  `${type}:${String(name).toLowerCase().replace(/\s+/g, ' ').trim()}`;
