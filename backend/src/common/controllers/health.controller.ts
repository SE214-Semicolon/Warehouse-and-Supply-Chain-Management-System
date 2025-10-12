import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-10-12T02:45:42.989Z',
        uptime: 123.456,
        version: '1.0.0',
      },
    },
  })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept connections',
    schema: {
      example: {
        status: 'ready',
        timestamp: '2025-10-12T02:45:42.989Z',
        database: 'connected',
        cache: 'connected',
      },
    },
  })
  async readinessCheck() {
    // In a real implementation, you would check database connectivity, cache, etc.
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected',
      cache: 'connected',
    };
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive and responding',
    schema: {
      example: {
        status: 'alive',
        timestamp: '2025-10-12T02:45:42.989Z',
      },
    },
  })
  async livenessCheck() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}