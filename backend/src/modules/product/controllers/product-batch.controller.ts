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
import { ProductBatchService } from '../services/product-batch.service';
import { CreateProductBatchDto } from '../dto/create-product-batch.dto';
import { UpdateProductBatchDto } from '../dto/update-product-batch.dto';
import { QueryProductBatchDto } from '../dto/query-product-batch.dto';
import {
  ProductBatchResponseDto,
  ProductBatchListResponseDto,
  ProductBatchDeleteResponseDto,
} from '../dto/product-batch-response.dto';
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
  private readonly logger = new Logger(ProductBatchController.name);

  constructor(private readonly batchService: ProductBatchService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  @ApiOperation({ summary: 'Create a new product batch' })
  @ApiResponse({
    status: 201,
    description: 'Product batch created successfully.',
    type: ProductBatchResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 409, description: 'Batch number already exists for this product.' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBatchDto: CreateProductBatchDto): Promise<ProductBatchResponseDto> {
    this.logger.log(
      `POST /product-batches - Creating batch for product: ${createBatchDto.productId}`,
    );
    const result = await this.batchService.create(createBatchDto);
    this.logger.log(`Product batch created successfully: ${result.data.id}`);
    return result;
  }

  @Get()
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get all product batches with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Return all product batches.',
    type: ProductBatchListResponseDto,
  })
  async findAll(@Query() query: QueryProductBatchDto): Promise<ProductBatchListResponseDto> {
    this.logger.log(`GET /product-batches - Query: ${JSON.stringify(query)}`);
    const result = await this.batchService.findAll(query);
    this.logger.log(`Found ${result.total} product batches`);
    return result;
  }

  @Get('expiring')
  @Roles(UserRole.admin, UserRole.manager, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get batches expiring soon' })
  @ApiResponse({
    status: 200,
    description: 'Return expiring batches.',
    type: ProductBatchListResponseDto,
  })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number, example: 30 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async findExpiring(
    @Query('daysAhead') daysAhead?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ProductBatchListResponseDto> {
    const days = daysAhead ? Number(daysAhead) : 30;
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    this.logger.log(`GET /product-batches/expiring - Days: ${days}, Page: ${pageNum}`);
    const result = await this.batchService.findExpiring(days, pageNum, limitNum);
    return result;
  }

  @Get('product/:productId')
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get all batches for a specific product' })
  @ApiResponse({
    status: 200,
    description: 'Return product batches.',
    type: ProductBatchListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findByProduct(@Param('productId') productId: string): Promise<ProductBatchListResponseDto> {
    this.logger.log(`GET /product-batches/product/${productId}`);
    const result = await this.batchService.findByProduct(productId);
    return result;
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get a product batch by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the product batch.',
    type: ProductBatchResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product batch not found.' })
  async findOne(@Param('id') id: string): Promise<ProductBatchResponseDto> {
    this.logger.log(`GET /product-batches/${id}`);
    const result = await this.batchService.findOne(id);
    return result;
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Update a product batch' })
  @ApiResponse({
    status: 200,
    description: 'Product batch updated successfully.',
    type: ProductBatchResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product batch not found.' })
  @ApiResponse({ status: 409, description: 'Batch number already exists.' })
  async update(
    @Param('id') id: string,
    @Body() updateBatchDto: UpdateProductBatchDto,
  ): Promise<ProductBatchResponseDto> {
    this.logger.log(`PATCH /product-batches/${id}`);
    const result = await this.batchService.update(id, updateBatchDto);
    this.logger.log(`Product batch updated successfully: ${id}`);
    return result;
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Delete a product batch' })
  @ApiResponse({
    status: 200,
    description: 'Product batch deleted successfully.',
    type: ProductBatchDeleteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product batch not found.' })
  @ApiResponse({ status: 400, description: 'Cannot delete batch with existing inventory.' })
  async remove(@Param('id') id: string): Promise<ProductBatchDeleteResponseDto> {
    this.logger.log(`DELETE /product-batches/${id}`);
    const result = await this.batchService.remove(id);
    this.logger.log(`Product batch deleted successfully: ${id}`);
    return result;
  }
}
