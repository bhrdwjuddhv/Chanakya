import { Router } from 'express';
import { config, aiEnabled } from '../../config/index.js';
import { mongoHealth } from '../../lib/mongoose.js';
import { neo4jHealth } from '../../lib/neo4j.js';
import { qdrantHealth } from '../../lib/qdrant.js';
import { wrap } from '../../middleware/error.js';

async function ping(url, timeoutMs = 2500) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export const healthRoutes = Router();

healthRoutes.get(
  '/',
  wrap(async (req, res) => {
    const [mongo, neo4j, qdrant, insightface, afis] = await Promise.all([
      mongoHealth(),
      neo4jHealth(),
      qdrantHealth(),
      ping(`${config.insightface.url}/v1/health`),
      ping(`${config.afisUrl}/health`),
    ]);
    const services = { mongo, neo4j, qdrant, insightface, afis, ai: { ok: aiEnabled } };
    // Core = the three the app can't work without. Biometrics/AI degrade gracefully.
    const ok = mongo.ok && neo4j.ok && qdrant.ok;
    res.status(ok ? 200 : 503).json({ ok, services, uptime: Math.round(process.uptime()) });
  }),
);
