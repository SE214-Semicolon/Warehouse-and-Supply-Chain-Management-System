import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ShipmentService } from '../services/shipment.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { UpdateShipmentDto } from '../dto/update-shipment.dto';
import { UpdateShipmentStatusDto } from '../dto/update-shipment-status.dto';
import { AddTrackingEventDto } from '../dto/add-tracking-event.dto';
import { QueryShipmentDto } from '../dto/query-shipment.dto';

@ApiTags('shipments')
@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create new shipment' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics)
  create(@Body() dto: CreateShipmentDto) {
    return this.shipmentService.createShipment(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List shipments with filter/pagination' })
  @Roles(
    UserRole.admin,
    UserRole.manager,
    UserRole.logistics,
    UserRole.warehouse_staff,
    UserRole.sales,
  )
  list(@Query() query: QueryShipmentDto) {
    return this.shipmentService.list(query);
  }

  @Get('track/:trackingCode')
  @ApiOperation({ summary: 'Track shipment by tracking code (public)' })
  @Roles(
    UserRole.admin,
    UserRole.manager,
    UserRole.logistics,
    UserRole.warehouse_staff,
    UserRole.sales,
    UserRole.partner,
  )
  trackByCode(@Param('trackingCode') trackingCode: string) {
    return this.shipmentService.trackByCode(trackingCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment details' })
  @Roles(
    UserRole.admin,
    UserRole.manager,
    UserRole.logistics,
    UserRole.warehouse_staff,
    UserRole.sales,
  )
  findOne(@Param('id') id: string) {
    return this.shipmentService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shipment info (only when status is preparing)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics)
  update(@Param('id') id: string, @Body() dto: UpdateShipmentDto) {
    return this.shipmentService.updateShipment(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update shipment status with transitions validation' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateShipmentStatusDto) {
    return this.shipmentService.updateShipmentStatus(id, dto);
  }

  @Post(':id/tracking-events')
  @ApiOperation({ summary: 'Add tracking event to shipment' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.logistics)
  addTrackingEvent(@Param('id') id: string, @Body() dto: AddTrackingEventDto) {
    return this.shipmentService.addTrackingEvent(id, dto);
  }
}
