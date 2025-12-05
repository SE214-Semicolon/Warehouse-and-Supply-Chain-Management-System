import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SalesOrderService } from './sales-order.service';
import { CreateSalesOrderDto } from './dto/create-so.dto';
import { UpdateSalesOrderDto } from './dto/update-so.dto';
import { SubmitSalesOrderDto } from './dto/submit-so.dto';
import { FulfillSalesOrderDto } from './dto/fulfill-so.dto';
import { QuerySalesOrderDto } from './dto/query-so.dto';

@ApiTags('sales-orders')
@Controller('sales-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SalesOrderController {
  constructor(private readonly svc: SalesOrderService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo Sales Order (pending)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics)
  create(@Body() dto: CreateSalesOrderDto, @Req() req: { user: { userId: string } }) {
    return this.svc.createSalesOrder(dto, req.user.userId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit SO (pending -> approved)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics)
  submit(@Param('id') id: string, @Body() dto: SubmitSalesOrderDto) {
    return this.svc.submitSalesOrder(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết SO' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics, UserRole.warehouse_staff)
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách SO (filter/search/paginate)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics, UserRole.warehouse_staff)
  list(@Query() query: QuerySalesOrderDto) {
    return this.svc.list(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật pending SO' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics)
  update(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.svc.updateSalesOrder(id, dto);
  }

  @Post(':id/fulfill')
  @ApiOperation({ summary: 'Fulfill SO (dispatch inventory + mark as shipped)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff)
  fulfill(@Param('id') id: string, @Body() dto: FulfillSalesOrderDto) {
    return this.svc.fulfillSalesOrder(id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy SO' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics)
  cancel(@Param('id') id: string) {
    return this.svc.cancelSalesOrder(id);
  }
}
