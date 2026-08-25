import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectMongo } from './lib/mongoose.js';
import { connectNeo4j } from './lib/neo4j.js';
import { ensureCollection } from './lib/qdrant.js';
import { EMBED_DIM } from './lib/ai/provider.js';
import { logger } from './lib/logger.js';

// Mongo is required to boot. Neo4j/Qdrant are warned about and surfaced via /api/health
// so the app still starts when a container is slow — the UI shows a degraded banner.
await connectMongo();
await connectNeo4j().catch((err) => logger.warn(`neo4j unavailable: ${err.message}`));
await ensureCollection(EMBED_DIM).catch((err) => logger.warn(`qdrant unavailable: ${err.message}`));

createApp().listen(config.port, () => logger.info(`api listening on http://localhost:${config.port}`));
