import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { AuditLogService } from '../services/audit-log.service';
import { QueryAuditLogDto } from '../dto/query-audit-log.dto';
import { AuditLogListResponseDto } from '../dto/audit-log-response.dto';

@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly svc: AuditLogService) {}

  @Get()
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'List audit logs with filters and pagination' })
  @ApiOkResponse({
    description: 'Paged audit logs',
    type: AuditLogListResponseDto,
  })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  @ApiQuery({
    name: 'action',
    required: false,
    type: String,
    description: 'CREATE | UPDATE | DELETE',
  })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'search', required: false, type: String })
  async list(@Query() query: QueryAuditLogDto): Promise<AuditLogListResponseDto> {
    return this.svc.query(query);
  }
}
