import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ProductCategoryService } from '../services/product-category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { RolesGuard } from '../../../auth/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ProductCategoryResponseDto,
  ProductCategoryListResponseDto,
  ProductCategoryDeleteResponseDto,
} from '../dto/product-category-response.dto';

@ApiTags('product-categories')
@Controller('product-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductCategoryController {
  private readonly logger = new Logger(ProductCategoryController.name);

  constructor(private readonly productCategoryService: ProductCategoryService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Create a new product category' })
  @ApiResponse({
    status: 201,
    description: 'The category has been successfully created.',
    type: ProductCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<ProductCategoryResponseDto> {
    this.logger.log(`POST /product-categories - Creating category: ${createCategoryDto.name}`);
    return this.productCategoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all product categories' })
  @ApiResponse({
    status: 200,
    description: 'Return all categories.',
    type: ProductCategoryListResponseDto,
  })
  async findAll(): Promise<ProductCategoryListResponseDto> {
    this.logger.log('GET /product-categories - Fetching all');
    return this.productCategoryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product category by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the category.',
    type: ProductCategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async findOne(@Param('id') id: string): Promise<ProductCategoryResponseDto> {
    this.logger.log(`GET /product-categories/${id}`);
    return this.productCategoryService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Update a product category' })
  @ApiResponse({
    status: 200,
    description: 'The category has been successfully updated.',
    type: ProductCategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    this.logger.log(`PATCH /product-categories/${id}`);
    return this.productCategoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Delete a product category' })
  @ApiResponse({
    status: 200,
    description: 'The category has been successfully deleted.',
    type: ProductCategoryDeleteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 400, description: 'Cannot delete a category with children.' })
  async remove(@Param('id') id: string): Promise<ProductCategoryDeleteResponseDto> {
    this.logger.log(`DELETE /product-categories/${id}`);
    return this.productCategoryService.remove(id);
  }
}
