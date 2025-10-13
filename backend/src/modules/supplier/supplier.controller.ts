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
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';

@ApiTags('suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupplierController {
  constructor(private readonly svc: SupplierService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo nhà cung cấp' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  create(@Body() dto: CreateSupplierDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách nhà cung cấp (filter/paginate)' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  findAll(@Query() query: QuerySupplierDto) {
    return this.svc.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhà cung cấp' })
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật nhà cung cấp' })
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
