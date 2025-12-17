import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { SupplierService } from '../services/supplier.service';
import { CreateSupplierDto } from '../dto/supplier/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/supplier/update-supplier.dto';
import { QuerySupplierDto } from '../dto/supplier/query-supplier.dto';
import {
  SupplierResponseDto,
  SupplierListResponseDto,
  SupplierDeleteResponseDto,
} from '../dto/supplier/supplier-response.dto';

@ApiTags('suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupplierController {
  constructor(private readonly svc: SupplierService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo nhà cung cấp' })
  @ApiResponse({ status: 201, type: SupplierResponseDto })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  create(@Body() dto: CreateSupplierDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách nhà cung cấp (filter/paginate)' })
  @ApiResponse({ status: 200, type: SupplierListResponseDto })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  findAll(@Query() query: QuerySupplierDto) {
    return this.svc.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhà cung cấp' })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật nhà cung cấp' })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá nhà cung cấp' })
  @Roles(UserRole.admin, UserRole.manager)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
