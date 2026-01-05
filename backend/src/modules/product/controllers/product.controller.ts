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
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { QueryProductDto } from '../dto/query-product.dto';
import {
  ProductResponseDto,
  ProductListResponseDto,
  ProductDeleteResponseDto,
} from '../dto/product-response.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully.',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'SKU already exists.' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    this.logger.log(`POST /products - Creating product with SKU: ${createProductDto.sku}`);
    const result = await this.productService.create(createProductDto);
    this.logger.log(`Product created successfully: ${result.data.id}`);
    return result;
  }

  @Get()
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get all products with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Return all products.', type: ProductListResponseDto })
  async findAll(@Query() query: QueryProductDto): Promise<ProductListResponseDto> {
    this.logger.log(`GET /products - Query: ${JSON.stringify(query)}`);
    const result = await this.productService.findAll(query);
    this.logger.log(`Found ${result.total} products`);
    return result;
  }

  @Get('autocomplete')
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Autocomplete products by name or SKU' })
  @ApiResponse({
    status: 200,
    description: 'Return top matching products (id, sku, name, barcode).',
  })
  async autocomplete(@Query('search') search: string, @Query('limit') limit?: number) {
    const l = Math.min(Math.max(Number(limit ?? 10), 1), 50);
    this.logger.log(`GET /products/autocomplete - search: ${search}, limit: ${l}`);
    return this.productService.autocomplete(search, l);
  }

  @Get('sku/:sku')
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get a product by SKU' })
  @ApiResponse({ status: 200, description: 'Return the product.', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findBySku(@Param('sku') sku: string): Promise<ProductResponseDto> {
    this.logger.log(`GET /products/sku/${sku}`);
    const result = await this.productService.findBySku(sku);
    return result;
  }

  @Get('barcode/:barcode')
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get a product by barcode' })
  @ApiResponse({ status: 200, description: 'Return the product.', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findByBarcode(@Param('barcode') barcode: string): Promise<ProductResponseDto> {
    this.logger.log(`GET /products/barcode/${barcode}`);
    const result = await this.productService.findByBarcode(barcode);
    return result;
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement, UserRole.warehouse_staff)
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Return the product.', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    this.logger.log(`GET /products/${id}`);
    const result = await this.productService.findOne(id);
    return result;
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.procurement)
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully.',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 409, description: 'SKU already exists.' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    this.logger.log(`PATCH /products/${id}`);
    const result = await this.productService.update(id, updateProductDto);
    this.logger.log(`Product updated successfully: ${id}`);
    return result;
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully.',
    type: ProductDeleteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 400, description: 'Cannot delete product with existing batches.' })
  async remove(@Param('id') id: string): Promise<ProductDeleteResponseDto> {
    this.logger.log(`DELETE /products/${id}`);
    const result = await this.productService.remove(id);
    this.logger.log(`Product deleted successfully: ${id}`);
    return result;
  }
}
