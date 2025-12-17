import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dto/customer/create-customer.dto';
import { UpdateCustomerDto } from '../dto/customer/update-customer.dto';
import { QueryCustomerDto } from '../dto/customer/query-customer.dto';
import {
  CustomerResponseDto,
  CustomerListResponseDto,
  CustomerDeleteResponseDto,
} from '../dto/customer/customer-response.dto';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomerController {
  constructor(private readonly svc: CustomerService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.sales)
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Duplicate code' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCustomerDto) {
    return this.svc.create(dto);
  }

  @Get()
  @Roles(UserRole.admin, UserRole.manager, UserRole.sales)
  @ApiOperation({ summary: 'Get all customers with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Return list of customers',
    type: CustomerListResponseDto,
  })
  findAll(@Query() query: QueryCustomerDto) {
    return this.svc.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.sales)
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the customer',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.sales)
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({
    status: 200,
    description: 'Customer updated successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 400, description: 'Bad Request - Duplicate code' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({
    status: 200,
    description: 'Customer deleted successfully',
    type: CustomerDeleteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete - has active sales orders' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    return {
      success: true,
      message: 'Customer deleted successfully',
    };
  }
}
