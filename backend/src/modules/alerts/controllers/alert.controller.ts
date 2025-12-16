import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AlertService } from '../services/alert.service';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { QueryAlertDto } from '../dto/query-alert.dto';
import {
  AlertListResponseDto,
  AlertSingleResponseDto,
  AlertDeleteResponseDto,
  UnreadCountResponseDto,
} from '../dto/alert-response.dto';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AlertController {
  private readonly logger = new Logger(AlertController.name);

  constructor(private readonly alertService: AlertService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Create a new alert (manual/testing)' })
  @ApiResponse({
    status: 201,
    description: 'Alert created successfully',
    type: AlertSingleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No auth token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @HttpCode(HttpStatus.CREATED)
  async createAlert(@Body() dto: CreateAlertDto): Promise<AlertSingleResponseDto> {
    this.logger.log(`POST /alerts - Creating alert: ${dto.type}`);
    return this.alertService.createAlert(dto);
  }

  @Get()
  @Roles(
    UserRole.admin,
    UserRole.manager,
    UserRole.warehouse_staff,
    UserRole.procurement,
    UserRole.sales,
    UserRole.logistics,
    UserRole.analyst,
  )
  @ApiOperation({ summary: 'Get alerts with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved successfully',
    type: AlertListResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No auth token' })
  async getAlerts(@Query() dto: QueryAlertDto): Promise<AlertListResponseDto> {
    this.logger.log(`GET /alerts - Query params: ${JSON.stringify(dto)}`);
    return this.alertService.getAlerts(dto);
  }

  @Get('unread-count')
  @Roles(
    UserRole.admin,
    UserRole.manager,
    UserRole.warehouse_staff,
    UserRole.procurement,
    UserRole.sales,
    UserRole.logistics,
    UserRole.analyst,
  )
  @ApiOperation({ summary: 'Get unread alert count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    type: UnreadCountResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - No auth token' })
  async getUnreadCount(
    @Query('type') type?: string,
    @Query('severity') severity?: string,
  ): Promise<UnreadCountResponseDto> {
    this.logger.log(`GET /alerts/unread-count - Filters: type=${type}, severity=${severity}`);
    return this.alertService.getUnreadCount({ type, severity });
  }

  @Get(':id')
  @Roles(
    UserRole.admin,
    UserRole.manager,
    UserRole.warehouse_staff,
    UserRole.procurement,
    UserRole.sales,
    UserRole.logistics,
    UserRole.analyst,
  )
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiResponse({
    status: 200,
    description: 'Alert retrieved successfully',
    type: AlertSingleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No auth token' })
  async getAlertById(@Param('id') id: string): Promise<AlertSingleResponseDto> {
    this.logger.log(`GET /alerts/${id}`);
    return this.alertService.getAlertById(id);
  }

  @Patch(':id/read')
  @Roles(
    UserRole.admin,
    UserRole.manager,
    UserRole.warehouse_staff,
    UserRole.procurement,
    UserRole.sales,
    UserRole.logistics,
    UserRole.analyst,
  )
  @ApiOperation({ summary: 'Mark alert as read' })
  @ApiResponse({
    status: 200,
    description: 'Alert marked as read',
    type: AlertSingleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No auth token' })
  async markAsRead(@Param('id') id: string): Promise<AlertSingleResponseDto> {
    this.logger.log(`PATCH /alerts/${id}/read`);
    return this.alertService.markAsRead(id);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Delete alert by ID' })
  @ApiResponse({
    status: 200,
    description: 'Alert deleted successfully',
    type: AlertDeleteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No auth token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async deleteAlert(@Param('id') id: string): Promise<AlertDeleteResponseDto> {
    this.logger.log(`DELETE /alerts/${id}`);
    return this.alertService.deleteAlert(id);
  }
}
