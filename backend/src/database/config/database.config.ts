import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  postgres: {
    url:
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      'postgresql://warehouse_user:warehouse_pass@localhost:5432/warehouse_db',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    schema: process.env.POSTGRES_SCHEMA || 'public',
    logging: process.env.POSTGRES_LOGGING === 'true',
    poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || '10', 10),
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '100', 10),
    connectionTimeout: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000', 10),
    maxRetries: parseInt(process.env.POSTGRES_MAX_RETRIES || '5', 10),
    retryDelay: parseInt(process.env.POSTGRES_RETRY_DELAY || '5000', 10),
  },

  mongodb: {
    url:
      process.env.MONGODB_URL ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URL ||
      'mongodb://mongo_user:mongo_pass@localhost:27017/warehouse_logs?authSource=admin',
    host: process.env.MONGODB_HOST,
    port: parseInt(process.env.MONGODB_PORT || '27017', 10),
    database: process.env.MONGODB_DB,
    username: process.env.MONGODB_USER,
    password: process.env.MONGODB_PASSWORD,
    authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
    logging: process.env.MONGODB_LOGGING === 'true',
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '100', 10),
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10),
    connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS || '10000', 10),
    maxRetries: parseInt(process.env.MONGODB_MAX_RETRIES || '5', 10),
    retryDelay: parseInt(process.env.MONGODB_RETRY_DELAY || '5000', 10),
  },

  migrations: {
    auto: process.env.AUTO_RUN_MIGRATIONS === 'true',
    defaultAuto: process.env.NODE_ENV === 'development',
  },
}));
