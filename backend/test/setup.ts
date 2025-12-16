// Test setup file
import * as dotenv from 'dotenv';
import { join } from 'path';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load test environment variables from backend root
const envPath = join(__dirname, '..', '.env.test');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('Warning: Could not load .env.test file from:', envPath);
} else {
  console.log('✓ Loaded .env.test for testing');
}

// Ensure test environment
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URL =
  process.env.MONGO_URL ||
  'mongodb://mongo_user:mongo_pass@localhost:27017/warehouse_db?authSource=admin';

/**
 * DB strategy for integration tests:
 * - Use Testcontainers Postgres to avoid depending on local credentials.
 * - Run prisma migrations against the container before tests start.
 *
 * IMPORTANT: We do NOT change any test logic/assertions. Only environment wiring.
 */
let pgContainer: StartedPostgreSqlContainer | undefined;
let originalDatabaseUrl: string | undefined;

beforeAll(async () => {
  // Provision an isolated Postgres for this test file to avoid local DB dependencies.
  originalDatabaseUrl = process.env.DATABASE_URL;
  pgContainer = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('warehouse_test_db')
    .withUsername('warehouse_test_user')
    .withPassword('warehouse_test_pass')
    .withExposedPorts(5432)
    .start();

  process.env.DATABASE_URL = pgContainer.getConnectionUri();

  // Ensure schema exists for suites that don't run migrations themselves.
  await execAsync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
}, 120000);

afterAll(async () => {
  if (pgContainer) {
    await pgContainer.stop();
    pgContainer = undefined;
  }
  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }
}, 60000);
