import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { DemandPlanningReportingService } from '../services/demand-planning-reporting.service';
import { DemandForecastAccuracyReportDto } from '../dto/demand-planning-report.dto';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('reports/demand-planning')
@Controller('reports/demand-planning')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DemandPlanningReportingController {
  private readonly logger = new Logger(DemandPlanningReportingController.name);

  constructor(private readonly demandPlanningReportingService: DemandPlanningReportingService) {}

  @Get('accuracy')
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.sales, UserRole.analyst)
  @ApiOperation({ summary: 'Get demand forecast accuracy report' })
  @ApiResponse({
    status: 200,
    description: 'Forecast accuracy report with MAE, MAPE metrics',
    schema: {
      example: {
        success: true,
        accuracyData: [],
        summaryStats: {
          totalForecasts: 0,
          averageAccuracy: 0,
          averageMAE: 0,
          averageMAPE: 0,
        },
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    },
  })
  async getDemandForecastAccuracyReport(@Query() dto: DemandForecastAccuracyReportDto) {
    this.logger.log(
      `GET /reports/demand-planning/accuracy - from ${dto.startDate || 'all'} to ${dto.endDate || 'all'}`,
    );
    return this.demandPlanningReportingService.getDemandForecastAccuracyReport(dto);
  }
}
