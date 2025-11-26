// Test setup file
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load test environment variables from backend root
const envPath = join(__dirname, '..', '.env.test');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('Warning: Could not load .env.test file from:', envPath);
} else {
  console.log('✓ Loaded .env.test for testing');
}

// Set default values if not loaded
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://warehouse_user:warehouse_pass@localhost:5432/warehouse_db';
process.env.MONGO_URL =
  process.env.MONGO_URL ||
  'mongodb://mongo_user:mongo_pass@localhost:27017/warehouse_db?authSource=admin';
