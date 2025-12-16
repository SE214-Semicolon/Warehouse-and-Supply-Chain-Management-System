import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { ProductReportingService } from '../services/product-reporting.service';
import { ProductPerformanceReportDto } from '../dto/product-report.dto';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('reports/product')
@Controller('reports/product')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductReportingController {
  private readonly logger = new Logger(ProductReportingController.name);

  constructor(private readonly productReportingService: ProductReportingService) {}

  @Get('performance')
  @Roles(UserRole.admin, UserRole.manager, UserRole.analyst)
  @ApiOperation({ summary: 'Get product performance report' })
  @ApiResponse({
    status: 200,
    description: 'Product performance report with turnover and movement metrics',
    schema: {
      example: {
        success: true,
        performanceData: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        period: {
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        },
      },
    },
  })
  async getProductPerformanceReport(@Query() dto: ProductPerformanceReportDto) {
    this.logger.log(
      `GET /reports/product/performance - from ${dto.startDate || 'default'} to ${dto.endDate || 'default'}`,
    );
    return this.productReportingService.getProductPerformanceReport(dto);
  }
}
