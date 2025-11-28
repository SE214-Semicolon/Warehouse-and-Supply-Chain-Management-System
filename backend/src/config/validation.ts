import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  APP_NAME: Joi.string().default('warehouse-system'),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  APP_FALLBACK_LANGUAGE: Joi.string().default('en'),
  APP_HEADER_LANGUAGE: Joi.string().default('x-custom-lang'),

  // PostgreSQL Database (for transactional data)
  POSTGRES_URL: Joi.string().uri().optional(),
  POSTGRES_HOST: Joi.string().optional(),
  POSTGRES_PORT: Joi.number().default(5432),
  POSTGRES_DB: Joi.string().optional(),
  POSTGRES_USER: Joi.string().optional(),
  POSTGRES_PASSWORD: Joi.string().optional(),
  POSTGRES_SCHEMA: Joi.string().default('public'),
  POSTGRES_LOGGING: Joi.boolean().default(false),
  POSTGRES_POOL_SIZE: Joi.number().default(10),

  // MongoDB Database (for logs and metrics)
  MONGODB_URL: Joi.string().uri().optional(),
  MONGODB_HOST: Joi.string().optional(),
  MONGODB_PORT: Joi.number().default(27017),
  MONGODB_DB: Joi.string().optional(),
  MONGODB_USER: Joi.string().optional(),
  MONGODB_PASSWORD: Joi.string().optional(),
  MONGODB_AUTH_SOURCE: Joi.string().default('admin'),
  MONGODB_LOGGING: Joi.boolean().default(false),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(10).default('dev-access-secret'),
  JWT_REFRESH_SECRET: Joi.string().min(10).default('dev-refresh-secret'),
  JWT_ACCESS_TTL: Joi.string().default('900s'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
});
