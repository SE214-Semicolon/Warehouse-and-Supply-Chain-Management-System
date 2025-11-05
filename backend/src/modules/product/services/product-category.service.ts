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

  async findOne(id: string): Promise<ProductCategoryResponseDto> {
    this.logger.log(`Finding category by ID: ${id}`);
    const category = await this.categoryRepo.findOne(id);
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return { success: true, data: category };
  }

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
