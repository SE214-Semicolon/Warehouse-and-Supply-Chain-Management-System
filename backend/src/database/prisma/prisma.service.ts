import {
  INestApplication,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 5;
  private readonly retryDelay = 5000; // 5 seconds

  constructor(private configService: ConfigService) {
    const postgresConfig = configService.get('database.postgres');

    super({
      datasources: {
        db: {
          url: postgresConfig.url,
        },
      },
      log: [
        { level: 'warn', emit: 'stdout' } as const,
        { level: 'error', emit: 'stdout' } as const,
        ...(postgresConfig.logging ? [{ level: 'query', emit: 'stdout' } as const] : []),
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to PostgreSQL database');
    } catch (error) {
      if (attempt <= this.maxRetries) {
        this.logger.warn(
          `Failed to connect to PostgreSQL (attempt ${attempt}/${this.maxRetries}). Retrying in ${
            this.retryDelay / 1000
          }s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        await this.connectWithRetry(attempt + 1);
      } else {
        this.logger.error('Failed to connect to PostgreSQL database after maximum retry attempts');
        throw error;
      }
    }
  }

  async executeWithTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      timeout?: number;
      maxWait?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    const result = await this.$transaction(async (tx) => {
      try {
        return await fn(tx);
      } catch (error) {
        this.logger.error('Transaction failed:', error);
        throw error;
      }
    }, options);

    return result;
  }

  enableShutdownHooks(app: INestApplication): void {
    this.logger.log('Enabling shutdown hooks');
    app.enableShutdownHooks();

    process.on('beforeExit', async () => {
      await this.$disconnect();
    });
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      await this.$queryRaw`SELECT 1`;
      return { status: 'ok', message: 'Database connection is healthy' };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return { status: 'error', message: 'Database connection is not healthy' };
    }
  }

  // Helper method for soft delete queries
  protected addSoftDeleteFilter<T extends Record<string, any>>(where: T): T & { deletedAt: null } {
    return {
      ...where,
      deletedAt: null,
    };
  }

  // Helper method for soft delete operations
  protected markAsDeleted<T extends Record<string, any>>(data: T): T & { deletedAt: Date } {
    return {
      ...data,
      deletedAt: new Date(),
    };
  }
}
