import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // PostgreSQL config for transactional data
  postgres: {
    url: process.env.POSTGRES_URL,
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    schema: process.env.POSTGRES_SCHEMA || 'public',
    logging: process.env.POSTGRES_LOGGING === 'true',
    poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || '10', 10),
  },

  // MongoDB config for logs and metrics
  mongodb: {
    url: process.env.MONGODB_URL,
    host: process.env.MONGODB_HOST,
    port: parseInt(process.env.MONGODB_PORT || '27017', 10),
    database: process.env.MONGODB_DB,
    username: process.env.MONGODB_USER,
    password: process.env.MONGODB_PASSWORD,
    authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
    logging: process.env.MONGODB_LOGGING === 'true',
  },
}));
