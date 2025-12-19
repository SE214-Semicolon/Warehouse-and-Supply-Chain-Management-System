import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { DemandPlanningService } from '../services/demand-planning.service';
import { CreateForecastDto } from '../dto/create-forecast.dto';
import { UpdateForecastDto } from '../dto/update-forecast.dto';
import { QueryForecastDto } from '../dto/query-forecast.dto';
import { RunAlgorithmDto } from '../dto/run-algorithm.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('demand-planning')
@Controller('demand-planning')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DemandPlanningController {
  private readonly logger = new Logger(DemandPlanningController.name);

  constructor(private readonly demandPlanningService: DemandPlanningService) {}

  /**
   * Create a new forecast
   * Authorization: Admin, Manager, Analyst
   */
  @Post('forecasts')
  @Roles(UserRole.admin, UserRole.manager, UserRole.analyst)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new demand forecast',
    description:
      'Create a forecast for a specific product and date. Only Admin, Manager, and Analyst can create forecasts.',
  })
  @ApiResponse({ status: 201, description: 'Forecast created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Validation error or duplicate forecast' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createForecast(@Body() dto: CreateForecastDto) {
    this.logger.log(`Creating forecast for product ${dto.productId}`);
    return this.demandPlanningService.createForecast(dto);
  }

  /**
   * Get forecast by ID
   * Authorization: Admin, Manager, Analyst, Procurement (read-only), Sales (read-only)
   */
  @Get('forecasts/:id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.analyst, UserRole.procurement, UserRole.sales)
  @ApiOperation({
    summary: 'Get forecast by ID',
    description:
      'Retrieve a specific forecast. Available to Admin, Manager, Analyst, Procurement, and Sales.',
  })
  @ApiResponse({ status: 200, description: 'Forecast retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getForecast(@Param('id') id: string) {
    return this.demandPlanningService.getForecastById(id);
  }

  /**
   * Query forecasts with filters
   * Authorization: Admin, Manager, Analyst, Procurement (read-only), Sales (read-only)
   */
  @Get('forecasts')
  @Roles(UserRole.admin, UserRole.manager, UserRole.analyst, UserRole.procurement, UserRole.sales)
  @ApiOperation({
    summary: 'Query forecasts with filters',
    description:
      'Search forecasts by product, date range, or algorithm. Available to Admin, Manager, Analyst, Procurement, and Sales.',
  })
  @ApiResponse({ status: 200, description: 'Forecasts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async queryForecasts(@Query() dto: QueryForecastDto) {
    return this.demandPlanningService.queryForecasts(dto);
  }

  /**
   * Update a forecast
   * Authorization: Admin, Manager, Analyst
   */
  @Put('forecasts/:id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.analyst)
  @ApiOperation({
    summary: 'Update a forecast',
    description:
      'Update an existing forecast. Only Admin, Manager, and Analyst can update forecasts.',
  })
  @ApiResponse({ status: 200, description: 'Forecast updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Validation error' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async updateForecast(@Param('id') id: string, @Body() dto: UpdateForecastDto) {
    this.logger.log(`Updating forecast ${id}`);
    return this.demandPlanningService.updateForecast(id, dto);
  }

  /**
   * Delete a forecast
   * Authorization: Admin, Manager
   */
  @Delete('forecasts/:id')
  @Roles(UserRole.admin, UserRole.manager)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a forecast',
    description: 'Delete a forecast. Only Admin and Manager can delete forecasts.',
  })
  @ApiResponse({ status: 200, description: 'Forecast deleted successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async deleteForecast(@Param('id') id: string) {
    this.logger.log(`Deleting forecast ${id}`);
    return this.demandPlanningService.deleteForecast(id);
  }

  /**
   * Run forecasting algorithm for a product
   * Authorization: Admin, Manager, Analyst
   */
  @Post('forecasts/run/:productId')
  @Roles(UserRole.admin, UserRole.manager, UserRole.analyst)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run forecasting algorithm',
    description:
      'Generate forecasts for a product using a specified algorithm. Only Admin, Manager, and Analyst can run algorithms.',
  })
  @ApiResponse({ status: 200, description: 'Forecasts generated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Validation error or insufficient historical data',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async runAlgorithm(@Param('productId') productId: string, @Body() dto: RunAlgorithmDto) {
    this.logger.log(`Running ${dto.algorithm} for product ${productId}`);
    return this.demandPlanningService.runAlgorithm(productId, dto);
  }
}
