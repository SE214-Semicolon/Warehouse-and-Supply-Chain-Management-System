import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { SalesReportingService } from '../services/sales-reporting.service';
import { SOPerformanceReportDto, SalesTrendsReportDto } from '../dto/sales-report.dto';

@ApiTags('Sales Reports')
@ApiBearerAuth()
@Controller('reports/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesReportingController {
  constructor(private readonly salesReportingService: SalesReportingService) {}

  @Get('so-performance')
  @Roles('admin', 'manager', 'analyst', 'sales')
  @ApiOperation({
    summary: 'SO Performance Report',
    description:
      'Analyze Sales Order performance metrics including status distribution, fulfillment time, and rates',
  })
  @ApiResponse({
    status: 200,
    description: 'SO Performance Report generated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have required role (ADMIN, MANAGER, ANALYST, SALES)',
  })
  async getSOPerformance(@Query() dto: SOPerformanceReportDto) {
    return this.salesReportingService.getSOPerformance({
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      customerId: dto.customerId,
      status: dto.status,
      page: dto.page,
      limit: dto.limit,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    });
  }

  @Get('sales-trends')
  @Roles('admin', 'manager', 'analyst', 'sales')
  @ApiOperation({
    summary: 'Sales Trends Report',
    description: 'Analyze sales volume and revenue trends over time, grouped by day/week/month',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales Trends Report generated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have required role (ADMIN, MANAGER, ANALYST, SALES)',
  })
  async getSalesTrends(@Query() dto: SalesTrendsReportDto) {
    return this.salesReportingService.getSalesTrends({
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      groupBy: dto.groupBy,
      productId: dto.productId,
      categoryId: dto.categoryId,
      page: dto.page,
      limit: dto.limit,
    });
  }
}
