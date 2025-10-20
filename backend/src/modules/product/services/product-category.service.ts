import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class ProductCategoryService {
  constructor(private readonly categoryRepo: ProductCategoryRepository) {}

  async create(createCategoryDto: CreateCategoryDto) {
    if (createCategoryDto.parentId) {
      const parent = await this.categoryRepo.findOne(createCategoryDto.parentId);
      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID "${createCategoryDto.parentId}" not found`,
        );
      }
    }
    return this.categoryRepo.create(createCategoryDto);
  }

  async findAll() {
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

    return categoryTree;
  }

  async findOne(id: string) {
    const category = await this.categoryRepo.findOne(id);
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
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

    return this.categoryRepo.update(id, updateCategoryDto);
  }

  async remove(id: string) {
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

    return this.categoryRepo.delete(id);
  }
}
