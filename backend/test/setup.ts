// Test setup file
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load test environment variables
dotenv.config({ path: join(__dirname, '../.env.test') });
