import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';
import { CancelPurchaseOrderDto } from './dto/cancel-po.dto';
import { AddPurchaseOrderItemsDto } from './dto/add-po-items.dto';
import { RemovePurchaseOrderItemsDto } from './dto/remove-po-items.dto';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly svc: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo PO (draft)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  create(@Body() dto: CreatePurchaseOrderDto, @Req() req: { user: { userId: string } }) {
    return this.svc.createPurchaseOrder(dto, req.user.userId);
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

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật draft PO' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.svc.updatePurchaseOrder(id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy PO' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  cancel(@Param('id') id: string, @Body() dto: CancelPurchaseOrderDto) {
    return this.svc.cancelPurchaseOrder(id, dto);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Thêm items vào draft PO' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  addItems(@Param('id') id: string, @Body() dto: AddPurchaseOrderItemsDto) {
    return this.svc.addPurchaseOrderItems(id, dto.items);
  }

  @Delete(':id/items')
  @ApiOperation({ summary: 'Xóa items khỏi draft PO' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  removeItems(@Param('id') id: string, @Body() dto: RemovePurchaseOrderItemsDto) {
    return this.svc.removePurchaseOrderItems(id, dto.itemIds);
  }
}
