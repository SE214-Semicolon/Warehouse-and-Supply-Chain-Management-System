import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SalesOrderService } from '../services/sales-order.service';
import { CreateSalesOrderDto } from '../dto/sales-order/create-so.dto';
import { UpdateSalesOrderDto } from '../dto/sales-order/update-so.dto';
import { SubmitSalesOrderDto } from '../dto/sales-order/submit-so.dto';
import { FulfillSalesOrderDto } from '../dto/sales-order/fulfill-so.dto';
import { QuerySalesOrderDto } from '../dto/sales-order/query-so.dto';

@ApiTags('sales-orders')
@Controller('sales-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SalesOrderController {
  constructor(private readonly svc: SalesOrderService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo Sales Order (pending)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics, UserRole.sales)
  create(@Body() dto: CreateSalesOrderDto, @Req() req: { user: { userId: string } }) {
    return this.svc.createSalesOrder(dto, req.user.userId);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit SO (pending -> approved)',
    description: 'User ID được tự động lấy từ JWT token, không cần gửi trong body',
  })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics)
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitSalesOrderDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.svc.submitSalesOrder(id, dto, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết SO' })
  @Roles(
    UserRole.admin,
    UserRole.manager,
    UserRole.logistics,
    UserRole.warehouse_staff,
    UserRole.sales,
    UserRole.analyst,
  )
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách SO (filter/search/paginate)' })
  @Roles(
    UserRole.admin,
    UserRole.manager,
    UserRole.logistics,
    UserRole.warehouse_staff,
    UserRole.sales,
    UserRole.analyst,
  )
  list(@Query() query: QuerySalesOrderDto) {
    return this.svc.list(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật pending SO' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics, UserRole.sales)
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
