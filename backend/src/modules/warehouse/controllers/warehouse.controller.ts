import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { QueryWarehouseDto } from '../dto/query-warehouse.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { RolesGuard } from '../../../auth/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('warehouses')
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'Warehouse code already exists.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createWarehouseDto: CreateWarehouseDto) {
    return this.warehouseService.create(createWarehouseDto);
  }

  @Get()
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.logistics)
  @ApiOperation({ summary: 'Get all warehouses with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Return all warehouses.' })
  findAll(@Query() query: QueryWarehouseDto) {
    return this.warehouseService.findAll(query);
  }

  @Get('code/:code')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.logistics)
  @ApiOperation({ summary: 'Get a warehouse by code' })
  @ApiResponse({ status: 200, description: 'Return the warehouse.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  findByCode(@Param('code') code: string) {
    return this.warehouseService.findByCode(code);
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.logistics)
  @ApiOperation({ summary: 'Get a warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Return the warehouse.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  findOne(@Param('id') id: string) {
    return this.warehouseService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get warehouse statistics' })
  @ApiResponse({ status: 200, description: 'Return warehouse statistics.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  getStats(@Param('id') id: string) {
    return this.warehouseService.getWarehouseStats(id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated successfully.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  @ApiResponse({ status: 409, description: 'Warehouse code already exists.' })
  update(@Param('id') id: string, @Body() updateWarehouseDto: UpdateWarehouseDto) {
    return this.warehouseService.update(id, updateWarehouseDto);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Delete a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  @ApiResponse({ status: 400, description: 'Cannot delete warehouse with existing locations.' })
  remove(@Param('id') id: string) {
    return this.warehouseService.remove(id);
  }
}
