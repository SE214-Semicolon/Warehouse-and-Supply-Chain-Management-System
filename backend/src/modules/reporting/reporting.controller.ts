import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(
  UserRole.admin,
  UserRole.manager,
  UserRole.warehouse_staff,
  UserRole.procurement,
  UserRole.logistics,
)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('health')
  async healthCheck() {
    const isHealthy = await this.reportingService.healthCheck();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
    };
  }
}
