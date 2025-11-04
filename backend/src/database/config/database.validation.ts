import * as Joi from 'joi';

export const databaseValidationSchema = Joi.object({
  // PostgreSQL validation
  POSTGRES_URL: Joi.string()
    .custom((value, helpers) => {
      if (value && !value.startsWith('postgresql://')) {
        return helpers.error('string.postgresUri');
      }
      return value;
    })
    .messages({
      'string.postgresUri': 'POSTGRES_URL must be a valid PostgreSQL connection string',
    }),
  POSTGRES_HOST: Joi.string(),
  POSTGRES_PORT: Joi.number().default(5432),
  POSTGRES_DB: Joi.string(),
  POSTGRES_USER: Joi.string(),
  POSTGRES_PASSWORD: Joi.string(),
  POSTGRES_SCHEMA: Joi.string().default('public'),
  POSTGRES_LOGGING: Joi.boolean().default(false),
  POSTGRES_POOL_SIZE: Joi.number().default(10),
  POSTGRES_MAX_CONNECTIONS: Joi.number().default(100),
  POSTGRES_CONNECTION_TIMEOUT: Joi.number().default(10000),
  POSTGRES_MAX_RETRIES: Joi.number().default(5),
  POSTGRES_RETRY_DELAY: Joi.number().default(5000),

  // MongoDB validation
  MONGODB_URL: Joi.string()
    .custom((value, helpers) => {
      if (value && !value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
        return helpers.error('string.mongoUri');
      }
      return value;
    })
    .messages({
      'string.mongoUri': 'MONGODB_URL must be a valid MongoDB connection string',
    }),
  MONGODB_HOST: Joi.string(),
  MONGODB_PORT: Joi.number().default(27017),
  MONGODB_DB: Joi.string(),
  MONGODB_USER: Joi.string(),
  MONGODB_PASSWORD: Joi.string(),
  MONGODB_AUTH_SOURCE: Joi.string().default('admin'),
  MONGODB_LOGGING: Joi.boolean().default(false),
  MONGODB_MAX_POOL_SIZE: Joi.number().default(100),
  MONGODB_MIN_POOL_SIZE: Joi.number().default(5),
  MONGODB_CONNECT_TIMEOUT_MS: Joi.number().default(10000),
  MONGODB_MAX_RETRIES: Joi.number().default(5),
  MONGODB_RETRY_DELAY: Joi.number().default(5000),

  // Legacy support
  DATABASE_URL: Joi.string().optional(),
  MONGODB_URI: Joi.string().optional(),
  MONGO_URL: Joi.string().optional(),

  // Migrations
  AUTO_RUN_MIGRATIONS: Joi.boolean().default(false),
});
