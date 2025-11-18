import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import {
  ProductCategoryResponseDto,
  ProductCategoryListResponseDto,
  ProductCategoryDeleteResponseDto,
} from '../dto/product-category-response.dto';

@Injectable()
export class ProductCategoryService {
  private readonly logger = new Logger(ProductCategoryService.name);

  constructor(private readonly categoryRepo: ProductCategoryRepository) {}

  /**
   * Create Category API
   * Minimum test cases: 6
   * - CAT-TC01: Create with valid data (200)
   * - CAT-TC02: Create with parent category (200)
   * - CAT-TC03: Parent category not found (404)
   * - CAT-TC04: Missing required fields (tested by DTO)
   * - CAT-TC05: Permission denied (tested by guard)
   * - CAT-TC06: No authentication (tested by guard)
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<ProductCategoryResponseDto> {
    this.logger.log(`Creating category: ${createCategoryDto.name}`);
    if (createCategoryDto.parentId) {
      const parent = await this.categoryRepo.findOne(createCategoryDto.parentId);
      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID "${createCategoryDto.parentId}" not found`,
        );
      }
    }
    const category = await this.categoryRepo.create(createCategoryDto);
    this.logger.log(`Category created successfully: ${category.id}`);
    return { success: true, data: category, message: 'Category created successfully' };
  }

  /**
   * Get All Categories API
   * Minimum test cases: 4
   * - CAT-TC07: Get all categories with tree structure (200)
   * - CAT-TC08: Empty categories list (200)
   * - CAT-TC09: Permission denied (tested by guard)
   * - CAT-TC10: No authentication (tested by guard)
   */
  async findAll(): Promise<ProductCategoryListResponseDto> {
    this.logger.log('Fetching all categories and building tree');
    const categories = await this.categoryRepo.findAll();
    type CategoryWithChildren = (typeof categories)[0] & { children: CategoryWithChildren[] };
    const categoryMap = new Map<string, CategoryWithChildren>();
    const categoryTree: CategoryWithChildren[] = [];

    categories.forEach((category) => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    categories.forEach((category) => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          const child = categoryMap.get(category.id);
          if (child) {
            parent.children.push(child);
          }
        }
      } else {
        const rootCategory = categoryMap.get(category.id);
        if (rootCategory) {
          categoryTree.push(rootCategory);
        }
      }
    });

    this.logger.log(`Built category tree with ${categoryTree.length} root nodes`);
    return { success: true, data: categoryTree, total: categoryTree.length };
  }

  /**
   * Get Category by ID API
   * Minimum test cases: 5
   * - CAT-TC11: Find by valid ID (200)
   * - CAT-TC12: Category not found (404)
   * - CAT-TC13: Invalid ID format (tested by DTO)
   * - CAT-TC14: Permission denied (tested by guard)
   * - CAT-TC15: No authentication (tested by guard)
   */
  async findOne(id: string): Promise<ProductCategoryResponseDto> {
    this.logger.log(`Finding category by ID: ${id}`);
    const category = await this.categoryRepo.findOne(id);
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return { success: true, data: category };
  }

  /**
   * Update Category API
   * Minimum test cases: 8
   * - CAT-TC16: Update with valid data (200)
   * - CAT-TC17: Category not found (404)
   * - CAT-TC18: Parent category not found (404)
   * - CAT-TC19: Self-reference parent (400)
   * - CAT-TC20: Update parent category (200)
   * - CAT-TC21: Invalid ID format (tested by DTO)
   * - CAT-TC22: Permission denied (tested by guard)
   * - CAT-TC23: No authentication (tested by guard)
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    this.logger.log(`Updating category ${id}`);
    const category = await this.categoryRepo.findOne(id);
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent.');
      }
      const parent = await this.categoryRepo.findOne(updateCategoryDto.parentId);
      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID "${updateCategoryDto.parentId}" not found`,
        );
      }
    }

    const updated = await this.categoryRepo.update(id, updateCategoryDto);
    this.logger.log(`Category updated successfully: ${id}`);
    return { success: true, data: updated, message: 'Category updated successfully' };
  }

  /**
   * Delete Category API
   * Minimum test cases: 6
   * - CAT-TC24: Delete category successfully (200)
   * - CAT-TC25: Category not found (404)
   * - CAT-TC26: Delete category with children (400)
   * - CAT-TC27: Invalid ID format (tested by DTO)
   * - CAT-TC28: Permission denied (tested by guard)
   * - CAT-TC29: No authentication (tested by guard)
   * Total: 29 test cases for ProductCategoryService
   */
  async remove(id: string): Promise<ProductCategoryDeleteResponseDto> {
    this.logger.log(`Deleting category ${id}`);
    const category = await this.categoryRepo.findOne(id);
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    const categoryWithChildren = category as typeof category & { children?: Array<{ id: string }> };
    if (categoryWithChildren.children && categoryWithChildren.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete a category with children. Please delete or move children first.',
      );
    }

    await this.categoryRepo.delete(id);
    this.logger.log(`Category deleted successfully: ${id}`);
    return { success: true, message: 'Category deleted successfully' };
  }
}
