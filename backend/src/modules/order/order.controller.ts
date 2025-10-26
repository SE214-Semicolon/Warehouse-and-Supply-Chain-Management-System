import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { OrderService } from './order.service';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { SubmitPurchaseOrderDto } from './dto/submit-po.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-po.dto';
import { QueryPurchaseOrderDto } from './dto/query-po.dto';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly svc: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo PO (draft)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.svc.createPurchaseOrder(dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit PO (draft -> ordered)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  submit(@Param('id') id: string, @Body() dto: SubmitPurchaseOrderDto) {
    return this.svc.submitPurchaseOrder(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết PO' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách PO (filter/search/paginate)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  list(@Query() query: QueryPurchaseOrderDto) {
    return this.svc.list(query);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Nhận hàng PO (partial/full) + cập nhật tồn kho' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  async receive(@Param('id') id: string, @Body() dto: ReceivePurchaseOrderDto) {
    return this.svc.receivePurchaseOrder(id, dto);
  }
}
