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
  Logger,
} from '@nestjs/common';
import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { QueryWarehouseDto } from '../dto/query-warehouse.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('warehouses')
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WarehouseController {
  private readonly logger = new Logger(WarehouseController.name);

  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'Warehouse code already exists.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createWarehouseDto: CreateWarehouseDto) {
    this.logger.log(`POST /warehouses - Creating warehouse with code: ${createWarehouseDto.code}`);
    return this.warehouseService.create(createWarehouseDto);
  }

  @Get()
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.logistics)
  @ApiOperation({ summary: 'Get all warehouses with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Return all warehouses.' })
  findAll(@Query() query: QueryWarehouseDto) {
    this.logger.log(`GET /warehouses - Fetching warehouses with query: ${JSON.stringify(query)}`);
    return this.warehouseService.findAll(query);
  }

  @Get('code/:code')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.logistics)
  @ApiOperation({ summary: 'Get a warehouse by code' })
  @ApiResponse({ status: 200, description: 'Return the warehouse.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  findByCode(@Param('code') code: string) {
    this.logger.log(`GET /warehouses/code/${code} - Fetching warehouse by code`);
    return this.warehouseService.findByCode(code);
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.logistics)
  @ApiOperation({ summary: 'Get a warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Return the warehouse.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  findOne(@Param('id') id: string) {
    this.logger.log(`GET /warehouses/${id} - Fetching warehouse by ID`);
    return this.warehouseService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get warehouse statistics' })
  @ApiResponse({ status: 200, description: 'Return warehouse statistics.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  getStats(@Param('id') id: string) {
    this.logger.log(`GET /warehouses/${id}/stats - Fetching warehouse stats`);
    return this.warehouseService.getWarehouseStats(id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated successfully.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  @ApiResponse({ status: 409, description: 'Warehouse code already exists.' })
  update(@Param('id') id: string, @Body() updateWarehouseDto: UpdateWarehouseDto) {
    this.logger.log(`PATCH /warehouses/${id} - Updating warehouse`);
    return this.warehouseService.update(id, updateWarehouseDto);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Delete a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  @ApiResponse({ status: 400, description: 'Cannot delete warehouse with existing locations.' })
  remove(@Param('id') id: string) {
    this.logger.log(`DELETE /warehouses/${id} - Deleting warehouse`);
    return this.warehouseService.remove(id);
  }
}
