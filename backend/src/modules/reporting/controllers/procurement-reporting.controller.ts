import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProcurementReportingService } from '../services/procurement-reporting.service';
import {
  POPerformanceReportDto,
  SupplierPerformanceReportDto,
} from '../dto/procurement-report.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Procurement Reports')
@Controller('reports/procurement')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProcurementReportingController {
  constructor(private readonly reportingService: ProcurementReportingService) {}

  /**
   * PO Performance Report
   * Metrics: Total POs by status, average lead time, fulfillment rates
   * Authorization: Admin, Manager, Analyst, Procurement
   */
  @Get('po-performance')
  @Roles(UserRole.admin, UserRole.manager, UserRole.analyst, UserRole.procurement)
  @ApiOperation({
    summary: 'Get PO Performance Report',
    description:
      'Analyzes purchase order performance including status distribution, lead times, and fulfillment rates. Available to Admin, Manager, Analyst, and Procurement roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'PO performance metrics retrieved successfully',
  })
  async getPOPerformance(@Query() dto: POPerformanceReportDto) {
    return this.reportingService.getPOPerformance({
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      supplierId: dto.supplierId,
      status: dto.status,
      page: dto.page,
      limit: dto.limit,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    });
  }

  /**
   * Supplier Performance Report
   * Metrics: Order volume, delivery performance, quality ratings
   * Authorization: Admin, Manager, Analyst, Procurement
   */
  @Get('supplier-performance')
  @Roles(UserRole.admin, UserRole.manager, UserRole.analyst, UserRole.procurement)
  @ApiOperation({
    summary: 'Get Supplier Performance Report',
    description:
      'Evaluates supplier performance based on order volume, lead times, on-time delivery rates, and fulfillment accuracy. Available to Admin, Manager, Analyst, and Procurement roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Supplier performance metrics retrieved successfully',
  })
  async getSupplierPerformance(@Query() dto: SupplierPerformanceReportDto) {
    return this.reportingService.getSupplierPerformance({
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      page: dto.page,
      limit: dto.limit,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    });
  }
}
