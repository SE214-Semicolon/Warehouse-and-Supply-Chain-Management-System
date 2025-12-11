import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { WarehouseReportingService } from '../services/warehouse-reporting.service';
import { WarehouseUtilizationReportDto } from '../dto/warehouse-report.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { RolesGuard } from '../../../auth/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('reports/warehouse')
@Controller('reports/warehouse')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WarehouseReportingController {
  private readonly logger = new Logger(WarehouseReportingController.name);

  constructor(private readonly warehouseReportingService: WarehouseReportingService) {}

  @Get('utilization')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.analyst)
  @ApiOperation({ summary: 'Get warehouse utilization report' })
  @ApiResponse({
    status: 200,
    description: 'Warehouse utilization report with capacity and occupancy metrics',
    schema: {
      example: {
        success: true,
        utilizationData: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    },
  })
  async getWarehouseUtilizationReport(@Query() dto: WarehouseUtilizationReportDto) {
    this.logger.log(
      `GET /reports/warehouse/utilization - warehouseId: ${dto.warehouseId || 'all'}`,
    );
    return this.warehouseReportingService.getWarehouseUtilizationReport(dto);
  }
}
