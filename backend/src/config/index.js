const env = process.env;

export const config = {
  port: Number(env.PORT || 4000),
  clientUrl: env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: env.JWT_SECRET || 'change_me',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '1d',

  mongoUri: env.MONGODB_URI || 'mongodb://localhost:27018/chanakya',
  neo4j: {
    uri: env.NEO4J_URI || 'bolt://localhost:7687',
    username: env.NEO4J_USERNAME || 'neo4j',
    password: env.NEO4J_PASSWORD || 'password123',
  },
  qdrantUrl: env.QDRANT_URL || 'http://localhost:6333',

  insightface: { url: env.INSIGHTFACE_URL || 'http://localhost:18097', apiKey: env.INSIGHTFACE_API_KEY || '' },
  afisUrl: env.AFIS_SERVICE_URL || 'http://localhost:8090',
  biometricEncKey: env.BIOMETRIC_TEMPLATE_ENC_KEY || '',

  ai: {
    provider: env.AI_PROVIDER || 'openai',
    openaiKey: env.OPENAI_API_KEY || '',
    anthropicKey: env.ANTHROPIC_API_KEY || '',
    chatModel: env.AI_CHAT_MODEL || 'gpt-4o-mini',
    embedModel: env.AI_EMBED_MODEL || 'text-embedding-3-small',
  },
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: env.CLOUDINARY_API_KEY || '',
    apiSecret: env.CLOUDINARY_API_SECRET || '',
  },
};

export const aiEnabled = Boolean(
  config.ai.provider === 'anthropic' ? config.ai.anthropicKey : config.ai.openaiKey,
);
