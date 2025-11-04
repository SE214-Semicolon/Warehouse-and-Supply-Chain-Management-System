import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'warehouse:',
  connectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '5000', 10),
  keepAlive: parseInt(process.env.REDIS_KEEPALIVE || '5000', 10),
  family: parseInt(process.env.REDIS_FAMILY || '4', 10), // 4 (IPv4) or 6 (IPv6)
}));
