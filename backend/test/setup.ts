// Test setup file
import * as dotenv from 'dotenv';
import { join } from 'path';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
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

/**
 * DB strategy for integration tests:
 * - Use Testcontainers for both PostgreSQL and MongoDB to avoid depending on local credentials.
 * - Run prisma migrations against the PostgreSQL container before tests start.
 * - Both containers are isolated and cleaned up after tests.
 *
 * IMPORTANT: We do NOT change any test logic/assertions. Only environment wiring.
 */
let pgContainer: StartedPostgreSqlContainer | undefined;
let mongoContainer: StartedMongoDBContainer | undefined;
let originalDatabaseUrl: string | undefined;
let originalMongoUrl: string | undefined;

beforeAll(async () => {
  // Only spawn containers for integration/e2e tests, not unit/smoke/sanity tests
  const testPath = expect.getState().testPath || '';
  const isIntegrationTest = testPath.includes('integration-test') || testPath.includes('e2e.spec');

  if (!isIntegrationTest) {
    // Skip Testcontainers for unit/smoke/sanity tests
    return;
  }

  // Provision isolated PostgreSQL for tests
  originalDatabaseUrl = process.env.DATABASE_URL;
  pgContainer = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('warehouse_test_db')
    .withUsername('warehouse_test_user')
    .withPassword('warehouse_test_pass')
    .withExposedPorts(5432)
    .start();

  // process.env.DATABASE_URL = pgContainer.getConnectionUri();
  const newPgUrl = pgContainer.getConnectionUri();
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  process.env.DATABASE_URL = newPgUrl;
  process.env.POSTGRES_URL = newPgUrl;
  console.log('Testcontainers Postgres started at:', newPgUrl);

  // Provision isolated MongoDB for tests
  originalMongoUrl = process.env.MONGO_URL;
  mongoContainer = await new MongoDBContainer('mongo:7').withExposedPorts(27017).start();

  // process.env.MONGO_URL = mongoContainer.getConnectionString();
  let newMongoUrl = mongoContainer.getConnectionString();

  if (newMongoUrl.includes('?')) {
    newMongoUrl += '&directConnection=true';
  } else {
    newMongoUrl += '?directConnection=true';
  }
  
  delete process.env.MONGO_URL;
  delete process.env.MONGODB_URL;
  
  process.env.MONGO_URL = newMongoUrl;
  process.env.MONGODB_URL = newMongoUrl;
  console.log('Testcontainers MongoDB started at:', newMongoUrl);

  // Ensure schema exists for suites that don't run migrations themselves.
//   await execAsync('npx prisma migrate deploy', {
//     env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
//   });
// }, 120000);

  await execAsync('npx prisma db push --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
  console.log('Prisma schema synced to container');
}, 120000);

afterAll(async () => {
  if (pgContainer) {
    await pgContainer.stop();
    pgContainer = undefined;
  }
  if (mongoContainer) {
    await mongoContainer.stop();
    mongoContainer = undefined;
  }
  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }
  if (originalMongoUrl) {
    process.env.MONGO_URL = originalMongoUrl;
  } else {
    delete process.env.MONGO_URL;
  }
}, 60000);
