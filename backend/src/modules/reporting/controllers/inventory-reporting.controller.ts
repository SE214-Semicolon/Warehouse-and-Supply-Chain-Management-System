import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { InventoryReportingService } from '../services/inventory-reporting.service';
import {
  LowStockReportDto,
  ExpiryReportDto,
  StockLevelReportDto,
  MovementReportDto,
  ValuationReportDto,
} from '../dto/inventory-report.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('reports/inventory')
@Controller('reports/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryReportingController {
  private readonly logger = new Logger(InventoryReportingController.name);

  constructor(private readonly inventoryReportingService: InventoryReportingService) {}

  @Get('low-stock')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.analyst)
  @ApiOperation({ summary: 'Get low stock report' })
  @ApiResponse({
    status: 200,
    description: 'Low stock inventory report',
    schema: {
      example: {
        success: true,
        inventories: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    },
  })
  async getLowStockReport(@Query() dto: LowStockReportDto) {
    this.logger.log(`GET /reports/inventory/low-stock - threshold: ${dto.threshold}`);
    return this.inventoryReportingService.getLowStockReport(dto);
  }

  @Get('expiry')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.analyst)
  @ApiOperation({ summary: 'Get expiry report' })
  @ApiResponse({
    status: 200,
    description: 'Expiring inventory report',
    schema: {
      example: {
        success: true,
        inventories: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    },
  })
  async getExpiryReport(@Query() dto: ExpiryReportDto) {
    this.logger.log(`GET /reports/inventory/expiry - daysAhead: ${dto.daysAhead}`);
    return this.inventoryReportingService.getExpiryReport(dto);
  }

  @Get('stock-levels')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.analyst)
  @ApiOperation({ summary: 'Get stock level report' })
  @ApiResponse({
    status: 200,
    description: 'Stock level report data',
    schema: {
      example: {
        success: true,
        groupedData: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    },
  })
  async getStockLevelReport(@Query() dto: StockLevelReportDto) {
    this.logger.log(`GET /reports/inventory/stock-levels - groupBy: ${dto.groupBy}`);
    return this.inventoryReportingService.getStockLevelReport(dto);
  }

  @Get('movements')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.analyst)
  @ApiOperation({ summary: 'Get movement report' })
  @ApiResponse({
    status: 200,
    description: 'Movement report data',
    schema: {
      example: {
        success: true,
        movements: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    },
  })
  async getMovementReport(@Query() dto: MovementReportDto) {
    this.logger.log(
      `GET /reports/inventory/movements - from ${dto.startDate || 'all'} to ${dto.endDate || 'all'}`,
    );
    return this.inventoryReportingService.getMovementReport(dto);
  }

  @Get('valuation')
  @Roles(UserRole.admin, UserRole.manager, UserRole.analyst)
  @ApiOperation({ summary: 'Get inventory valuation report' })
  @ApiResponse({
    status: 200,
    description: 'Valuation report data',
    schema: {
      example: {
        success: true,
        valuationData: [],
        grandTotal: 0,
        method: 'AVERAGE',
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    },
  })
  async getValuationReport(@Query() dto: ValuationReportDto) {
    this.logger.log(`GET /reports/inventory/valuation - method: ${dto.method}`);
    return this.inventoryReportingService.getValuationReport(dto);
  }
}
