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
    const categoryMap = new Map();
    const categoryTree = [];

    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    categories.forEach(category => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryMap.get(category.id));
        }
      } else {
        categoryTree.push(categoryMap.get(category.id));
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

    if (category.children && category.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete a category with children. Please delete or move children first.',
      );
    }

    return this.categoryRepo.delete(id);
  }
}
