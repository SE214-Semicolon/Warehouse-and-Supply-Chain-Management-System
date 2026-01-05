import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import {
  ProductCategoryResponseDto,
  ProductCategoryListResponseDto,
  ProductCategoryDeleteResponseDto,
} from '../dto/product-category-response.dto';
import { AuditMiddleware } from '../../../database/middleware/audit.middleware';

@Injectable()
export class ProductCategoryService {
  private readonly logger = new Logger(ProductCategoryService.name);

  constructor(
    private readonly categoryRepo: ProductCategoryRepository,
    private readonly auditMiddleware: AuditMiddleware,
  ) {}

  /**
   * Create Category API - Test Cases: 15
   * Basic:
   * - CAT-TC01: Create with valid data (200)
   * - CAT-TC02: Create with parent category (200)
   * - CAT-TC03: Parent category not found (404)
   * - CAT-TC04: Missing required fields (tested by DTO)
   * - CAT-TC05: Permission denied (tested by guard)
   * - CAT-TC06: No authentication (tested by guard)

   * Edge Cases:
   * - CAT-TC07: Empty string name → 400
   * - CAT-TC08: Whitespace only name → 400
   * - CAT-TC09: Very long name (>200 chars) → 400
   * - CAT-TC10: Name with special chars → 201
   * - CAT-TC11: Create without parent (root) → 201
   * - CAT-TC12: Invalid parent ID format → 404
   * - CAT-TC13: SQL injection in name → sanitized
   * - CAT-TC14: Duplicate name same parent → 201 (allowed)
   * - CAT-TC15: Create with description → 201
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

    // Audit log - async, don't block response
    this.auditMiddleware
      .logCreate('ProductCategory', category as Record<string, unknown>)
      .catch((err) => {
        this.logger.error('Failed to write audit log for category create', err);
      });

    return { success: true, data: category, message: 'Category created successfully' };
  }

  /**
   * Get All Categories API - Test Cases: 8
   * Basic:
   * - CAT-TC16: Get all categories with tree structure (200)
   * - CAT-TC17: Empty categories list (200)
   * - CAT-TC18: Permission denied (tested by guard)
   * - CAT-TC19: No authentication (tested by guard)

   * Edge Cases:
   * - CAT-TC20: Only root categories → 200
   * - CAT-TC21: Deep nested categories (3+ levels) → 200
   * - CAT-TC22: Orphaned categories (parent deleted) → handled
   * - CAT-TC23: Large number of categories → 200
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
   * Update Category API - Test Cases: 18
   * Basic:
   * - CAT-TC24: Update with valid data (200)
   * - CAT-TC25: Category not found (404)
   * - CAT-TC26: Parent category not found (404)
   * - CAT-TC27: Self-reference parent (400)
   * - CAT-TC28: Update parent category (200)
   * - CAT-TC29: Invalid ID format (tested by DTO)
   * - CAT-TC30: Permission denied (tested by guard)
   * - CAT-TC31: No authentication (tested by guard)

   * Edge Cases:
   * - CAT-TC32: Update only name → 200
   * - CAT-TC33: Update only description → 200
   * - CAT-TC34: Update only parent → 200
   * - CAT-TC35: Update all fields → 200
   * - CAT-TC36: Update with empty object → 200
   * - CAT-TC37: Update parent to null (make root) → 200
   * - CAT-TC38: Update to same parent → 200
   * - CAT-TC39: Circular reference check → 400
   * - CAT-TC40: Update name with special chars → 200
   * - CAT-TC41: Move to child's subtree → 400 (if checked)
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

    // Audit log - async, don't block response
    this.auditMiddleware
      .logUpdate(
        'ProductCategory',
        id,
        category as Record<string, unknown>,
        updated as Record<string, unknown>,
      )
      .catch((err) => {
        this.logger.error('Failed to write audit log for category update', err);
      });

    return { success: true, data: updated, message: 'Category updated successfully' };
  }

  /**
   * Delete Category API - Test Cases: 12
   * Basic:
   * - CAT-TC42: Delete category successfully (200)
   * - CAT-TC43: Category not found (404)
   * - CAT-TC44: Delete category with children (400)
   * - CAT-TC45: Invalid ID format (tested by DTO)
   * - CAT-TC46: Permission denied (tested by guard)
   * - CAT-TC47: No authentication (tested by guard)

   * Edge Cases:
   * - CAT-TC48: Delete with empty children array → 200
   * - CAT-TC49: Delete category with products → 200 or 400
   * - CAT-TC50: Delete root category → 200
   * - CAT-TC51: Delete leaf category → 200
   * - CAT-TC52: Concurrent delete → 404 second
   * - CAT-TC53: Invalid ID format → 404

   * Total: 53 test cases for ProductCategoryService
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

    // Audit log - async, don't block response
    this.auditMiddleware
      .logDelete('ProductCategory', id, category as Record<string, unknown>)
      .catch((err) => {
        this.logger.error('Failed to write audit log for category delete', err);
      });

    return { success: true, message: 'Category deleted successfully' };
  }
}
