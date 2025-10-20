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
import { LocationService } from '../services/location.service';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { QueryLocationDto } from '../dto/query-location.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { RolesGuard } from '../../../auth/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('locations')
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Create a new location' })
  @ApiResponse({ status: 201, description: 'Location created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  @ApiResponse({ status: 409, description: 'Location code already exists in this warehouse.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationService.create(createLocationDto);
  }

  @Get()
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.logistics)
  @ApiOperation({ summary: 'Get all locations with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Return all locations.' })
  findAll(@Query() query: QueryLocationDto) {
    return this.locationService.findAll(query);
  }

  @Get('warehouse/:warehouseId')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.logistics)
  @ApiOperation({ summary: 'Get all locations in a specific warehouse' })
  @ApiResponse({ status: 200, description: 'Return locations by warehouse.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  findByWarehouse(@Param('warehouseId') warehouseId: string) {
    return this.locationService.findByWarehouse(warehouseId);
  }

  @Get('warehouse/:warehouseId/available')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get available locations in a warehouse' })
  @ApiResponse({ status: 200, description: 'Return available locations.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  @ApiQuery({ name: 'minCapacity', required: false, type: Number })
  findAvailableLocations(
    @Param('warehouseId') warehouseId: string,
    @Query('minCapacity') minCapacity?: number,
  ) {
    return this.locationService.findAvailableLocations(
      warehouseId,
      minCapacity ? Number(minCapacity) : undefined,
    );
  }

  @Get('code/:warehouseId/:code')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.logistics)
  @ApiOperation({ summary: 'Get a location by warehouse and code' })
  @ApiResponse({ status: 200, description: 'Return the location.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  findByCode(@Param('warehouseId') warehouseId: string, @Param('code') code: string) {
    return this.locationService.findByCode(warehouseId, code);
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.logistics)
  @ApiOperation({ summary: 'Get a location by ID' })
  @ApiResponse({ status: 200, description: 'Return the location.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  findOne(@Param('id') id: string) {
    return this.locationService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get location statistics' })
  @ApiResponse({ status: 200, description: 'Return location statistics.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  getStats(@Param('id') id: string) {
    return this.locationService.getLocationStats(id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Update a location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  @ApiResponse({ status: 409, description: 'Location code already exists.' })
  update(@Param('id') id: string, @Body() updateLocationDto: UpdateLocationDto) {
    return this.locationService.update(id, updateLocationDto);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Delete a location' })
  @ApiResponse({ status: 200, description: 'Location deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Location not found.' })
  @ApiResponse({ status: 400, description: 'Cannot delete location with existing inventory.' })
  remove(@Param('id') id: string) {
    return this.locationService.remove(id);
  }
}
