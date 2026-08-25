import { demoRegistry } from './demoRegistry.js';
import { internalHoldings } from './internalHoldings.js';

/**
 * The connector registry.
 *
 * A connector declares which selector kinds it handles and returns records in one shape.
 * Normalisation, entity resolution and graph writing all live downstream, so adding a
 * source means writing one `search()` — nothing else changes.
 *
 * Both shipped connectors query data this instance is entitled to: a clearly-labelled
 * fictional public registry, and the platform's own case holdings. Nothing here scrapes
 * a live third-party system.
 */
export const CONNECTORS = [internalHoldings, demoRegistry];

export const connectorById = (id) => CONNECTORS.find((c) => c.id === id);

export const describeConnectors = () =>
  CONNECTORS.map(({ id, name, description, kinds, dataSource }) => ({
    id,
    name,
    description,
    kinds,
    dataSource,
  }));
