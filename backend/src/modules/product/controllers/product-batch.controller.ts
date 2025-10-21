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
import { ProductBatchService } from '../services/product-batch.service';
import { CreateProductBatchDto } from '../dto/create-product-batch.dto';
import { UpdateProductBatchDto } from '../dto/update-product-batch.dto';
import { QueryProductBatchDto } from '../dto/query-product-batch.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { RolesGuard } from '../../../auth/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('product-batches')
@Controller('product-batches')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductBatchController {
  constructor(private readonly batchService: ProductBatchService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff, UserRole.procurement)
  @ApiOperation({ summary: 'Create a new product batch' })
  @ApiResponse({ status: 201, description: 'Product batch created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 409, description: 'Batch number already exists for this product.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createBatchDto: CreateProductBatchDto) {
    return this.batchService.create(createBatchDto);
  }

  @Get()
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get all product batches with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Return all product batches.' })
  findAll(@Query() query: QueryProductBatchDto) {
    return this.batchService.findAll(query);
  }

  @Get('expiring')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get batches expiring soon' })
  @ApiResponse({ status: 200, description: 'Return expiring batches.' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number, example: 30 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  findExpiring(
    @Query('daysAhead') daysAhead?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.batchService.findExpiring(
      daysAhead ? Number(daysAhead) : 30,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('product/:productId')
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get all batches for a specific product' })
  @ApiResponse({ status: 200, description: 'Return product batches.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  findByProduct(@Param('productId') productId: string) {
    return this.batchService.findByProduct(productId);
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get a product batch by ID' })
  @ApiResponse({ status: 200, description: 'Return the product batch.' })
  @ApiResponse({ status: 404, description: 'Product batch not found.' })
  findOne(@Param('id') id: string) {
    return this.batchService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Update a product batch' })
  @ApiResponse({ status: 200, description: 'Product batch updated successfully.' })
  @ApiResponse({ status: 404, description: 'Product batch not found.' })
  @ApiResponse({ status: 409, description: 'Batch number already exists.' })
  update(@Param('id') id: string, @Body() updateBatchDto: UpdateProductBatchDto) {
    return this.batchService.update(id, updateBatchDto);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Delete a product batch' })
  @ApiResponse({ status: 200, description: 'Product batch deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Product batch not found.' })
  @ApiResponse({ status: 400, description: 'Cannot delete batch with existing inventory.' })
  remove(@Param('id') id: string) {
    return this.batchService.remove(id);
  }
}
