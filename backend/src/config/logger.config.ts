import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const loggerLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const formatMeta = (meta: any) => {
  const splat = (meta as any)[Symbol.for('splat')];
  if (splat && splat.length) {
    return splat.length === 1 ? JSON.stringify(splat[0]) : JSON.stringify(splat);
  }
  return '';
};

export const logger = WinstonModule.createLogger({
  levels: loggerLevels,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.errors({ stack: true }),
        nestWinstonModuleUtilities.format.nestLike('WarehouseSystem', {
          prettyPrint: true,
          colors: true,
        }),
        winston.format.printf(({ context, level, timestamp, message, ms, ...meta }) => {
          const metaStr = formatMeta(meta);
          return `${timestamp} [${context}] ${level}: ${message}${ms ? ` ${ms}` : ''}${
            metaStr ? ` - ${metaStr}` : ''
          }`;
        }),
      ),
    }),
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
        ]
      : []),
  ],
});
