import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * SMOKE TEST - System-wide
 * Purpose: Verify application can compile and critical dependencies load
 * Scope: No database, no HTTP calls - just module/config validation
 * Expected: < 10 seconds execution time
 *
 * TRUE SMOKE TESTS:
 * - No external dependencies (database, APIs, etc.)
 * - Use mocks for all services
 * - Only verify: modules load, configs exist, DI works
 */
describe('System Smoke Tests', () => {
  let module: TestingModule;

  // Mock all external dependencies
  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: { count: jest.fn().mockResolvedValue(0) },
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();
  }, 10000);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Application Bootstrap', () => {
    it('should compile AppModule successfully', () => {
      expect(module).toBeDefined();
    });

    it('should have all critical services registered', () => {
      const prisma = module.get(PrismaService, { strict: false });
      const jwtService = module.get(JwtService, { strict: false });
      const configService = module.get(ConfigService, { strict: false });

      expect(prisma).toBeDefined();
      expect(jwtService).toBeDefined();
      expect(configService).toBeDefined();
    });
  });

  describe('Environment Configuration', () => {
    it('should have JWT configuration', () => {
      const jwtSecret = process.env.JWT_ACCESS_SECRET;

      expect(jwtSecret).toBeDefined();
      expect(jwtSecret?.length).toBeGreaterThan(0);
    });

    it('should have database URL configured', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).toContain('postgresql://');
    });

    it('should have valid Node environment', () => {
      expect(process.env.NODE_ENV).toBeDefined();
      expect(['development', 'test', 'production']).toContain(process.env.NODE_ENV);
    });

    it('should have port configured', () => {
      const port = process.env.PORT || '3000';
      expect(parseInt(port)).toBeGreaterThan(0);
      expect(parseInt(port)).toBeLessThan(65536);
    });
  });

  describe('Core Service Dependencies', () => {
    it('should resolve PrismaService', () => {
      const prisma = module.get(PrismaService, { strict: false });
      expect(prisma).toBeDefined();
      expect(prisma.$connect).toBeDefined();
    });

    it('should resolve JwtService', () => {
      const jwtService = module.get(JwtService, { strict: false });
      expect(jwtService).toBeDefined();
      expect(jwtService.sign).toBeDefined();
      expect(jwtService.verify).toBeDefined();
    });

    it('should resolve ConfigService', () => {
      const configService = module.get(ConfigService, { strict: false });
      expect(configService).toBeDefined();
      expect(configService.get).toBeDefined();
    });
  });

  describe('Module Registration', () => {
    it('should have AppModule defined with all imports', () => {
      // Module compilation success means all controllers and providers are registered
      expect(module).toBeDefined();
      expect(module.select(AppModule)).toBeDefined();
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT tokens', () => {
      const jwtService = module.get(JwtService, { strict: false });
      const payload = { sub: 'test-user-id', email: 'test@example.com', role: 'admin' };

      const token = jwtService.sign(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should verify JWT tokens', () => {
      const jwtService = module.get(JwtService, { strict: false });
      const payload = { sub: 'test-user-id', email: 'test@example.com', role: 'admin' };

      const token = jwtService.sign(payload);
      const decoded = jwtService.verify(token);

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
    });
  });
});
