import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().optional(),
  MONGO_URL: Joi.string().uri().optional(),
  MONGODB_URI: Joi.string().uri().optional(),
  JWT_ACCESS_SECRET: Joi.string().min(10).default('dev-access-secret'),
  JWT_REFRESH_SECRET: Joi.string().min(10).default('dev-refresh-secret'),
  JWT_ACCESS_TTL: Joi.string().default('900s'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
});
