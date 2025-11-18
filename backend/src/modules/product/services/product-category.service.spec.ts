import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategoryService } from '../services/product-category.service';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProductCategoryService', () => {
  let service: ProductCategoryService;
  let categoryRepo: jest.Mocked<ProductCategoryRepository>;

  const mockCategory = {
    id: 'category-uuid-1',
    name: 'Electronics',
    description: 'Electronic products',
    parentId: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockCategoryRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCategoryService,
        {
          provide: ProductCategoryRepository,
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<ProductCategoryService>(ProductCategoryService);
    categoryRepo = module.get(ProductCategoryRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    // CAT-TC01: Create with valid data
    it('should create a category successfully with valid data', async () => {
      const createDto = {
        name: 'Electronics',
        description: 'Electronic products',
      };
      const categoryData = { ...mockCategory };

      categoryRepo.create.mockResolvedValue(categoryData);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(categoryData);
      expect(result.message).toBe('Category created successfully');
      expect(categoryRepo.create).toHaveBeenCalledWith(createDto);
    });

    // CAT-TC02: Create with parent category
    it('should create a category with parent category', async () => {
      const createDto = {
        name: 'Laptops',
        description: 'Laptop computers',
        parentId: 'parent-uuid',
      };
      const parentCategory = { ...mockCategory, id: 'parent-uuid', name: 'Electronics' };
      const childCategory = {
        ...mockCategory,
        id: 'child-uuid',
        name: 'Laptops',
        parentId: 'parent-uuid',
      };

      categoryRepo.findOne.mockResolvedValue(parentCategory);
      categoryRepo.create.mockResolvedValue(childCategory);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.parentId).toBe('parent-uuid');
      expect(categoryRepo.findOne).toHaveBeenCalledWith('parent-uuid');
      expect(categoryRepo.create).toHaveBeenCalledWith(createDto);
    });

    // CAT-TC03: Parent category not found
    it('should throw NotFoundException if parent category does not exist', async () => {
      const createDto = {
        name: 'Tablets',
        parentId: 'invalid-uuid',
      };

      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Parent category with ID "invalid-uuid" not found',
      );
    });

    // CAT-TC04: Missing required fields tested by DTO
    // CAT-TC05: Permission denied tested by guard
    // CAT-TC06: No authentication tested by guard
  });

  describe('findAll', () => {
    // CAT-TC07: Get all categories with tree structure
    it('should return all categories with tree structure', async () => {
      const categories = [
        { id: '1', name: 'Electronics', parentId: null, metadata: {} },
        { id: '2', name: 'Laptops', parentId: '1', metadata: {} },
        { id: '3', name: 'Smartphones', parentId: '1', metadata: {} },
        { id: '4', name: 'Gaming Laptops', parentId: '2', metadata: {} },
      ];

      categoryRepo.findAll.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // 1 root node
      // Note: Tree structure with children is built by buildTree internal method
      expect(result.total).toBe(1);
    });

    // CAT-TC08: Empty categories list
    it('should return empty array when no categories exist', async () => {
      categoryRepo.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    // CAT-TC09: Permission denied tested by guard
    // CAT-TC10: No authentication tested by guard
  });

  describe('findOne', () => {
    // CAT-TC11: Find by valid ID
    it('should return a category by valid ID', async () => {
      categoryRepo.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne('category-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategory);
      expect(categoryRepo.findOne).toHaveBeenCalledWith('category-uuid-1');
    });

    // CAT-TC12: Category not found
    it('should throw NotFoundException if category not found', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Category with ID "invalid-id" not found',
      );
    });

    // CAT-TC13: Invalid ID format tested by DTO
    // CAT-TC14: Permission denied tested by guard
    // CAT-TC15: No authentication tested by guard
  });

  describe('update', () => {
    // CAT-TC16: Update with valid data
    it('should update a category successfully with valid data', async () => {
      const updateDto = {
        name: 'Updated Electronics',
        description: 'New description',
      };
      const updatedCategory = {
        ...mockCategory,
        name: 'Updated Electronics',
        description: 'New description',
      };

      categoryRepo.findOne.mockResolvedValue(mockCategory);
      categoryRepo.update.mockResolvedValue(updatedCategory);

      const result = await service.update('category-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Electronics');
      expect(result.message).toBe('Category updated successfully');
      expect(categoryRepo.update).toHaveBeenCalledWith('category-uuid-1', updateDto);
    });

    // CAT-TC17: Category not found
    it('should throw NotFoundException if category not found', async () => {
      const updateDto = { name: 'Updated Name' };

      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(
        'Category with ID "invalid-id" not found',
      );
    });

    // CAT-TC18: Parent category not found
    it('should throw NotFoundException if parent category not found', async () => {
      const updateDto = { parentId: 'invalid-parent-uuid' };

      categoryRepo.findOne.mockImplementation(async (id: string) => {
        // Lần gọi 1: Tìm danh mục hiện tại ('category-uuid-1')
        if (id === 'category-uuid-1') {
          return mockCategory; // Thành công
        }
        // Lần gọi 2: Tìm danh mục cha ('invalid-parent-uuid')
        if (id === 'invalid-parent-uuid') {
          return null; // Thất bại -> Kích hoạt Lỗi 2 mong đợi
        }
        return null; // Trả về null cho các ID khác
      });

      await expect(service.update('category-uuid-1', updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update('category-uuid-1', updateDto)).rejects.toThrow(
        'Parent category with ID "invalid-parent-uuid" not found',
      );
    });

    // CAT-TC19: Self-reference parent
    it('should throw BadRequestException if category tries to be its own parent', async () => {
      const updateDto = { parentId: 'category-uuid-1' };

      categoryRepo.findOne.mockResolvedValue(mockCategory);

      await expect(service.update('category-uuid-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('category-uuid-1', updateDto)).rejects.toThrow(
        'A category cannot be its own parent.',
      );
    });

    // CAT-TC20: Update parent category
    it('should update parent category successfully', async () => {
      const updateDto = { parentId: 'valid-parent-uuid' };
      const parentCategory = { ...mockCategory, id: 'valid-parent-uuid', name: 'Parent' };
      const updatedCategory = {
        ...mockCategory,
        parentId: 'valid-parent-uuid',
      };

      categoryRepo.findOne
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(parentCategory);
      categoryRepo.update.mockResolvedValue(updatedCategory);

      const result = await service.update('category-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.parentId).toBe('valid-parent-uuid');
      expect(categoryRepo.findOne).toHaveBeenCalledWith('valid-parent-uuid');
    });

    // CAT-TC21: Invalid ID format tested by DTO
    // CAT-TC22: Permission denied tested by guard
    // CAT-TC23: No authentication tested by guard
  });

  describe('remove', () => {
    // CAT-TC24: Delete category successfully
    it('should delete a category successfully', async () => {
      const category = { ...mockCategory, children: [] };

      categoryRepo.findOne.mockResolvedValue(category);
      categoryRepo.delete.mockResolvedValue(category);

      const result = await service.remove('category-uuid-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Category deleted successfully');
      expect(categoryRepo.delete).toHaveBeenCalledWith('category-uuid-1');
    });

    // CAT-TC25: Category not found
    it('should throw NotFoundException if category not found', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('invalid-id')).rejects.toThrow(
        'Category with ID "invalid-id" not found',
      );
    });

    // CAT-TC26: Delete category with children
    it('should throw BadRequestException if category has children', async () => {
      const categoryWithChildren = {
        ...mockCategory,
        children: [{ id: 'child-1' }, { id: 'child-2' }],
      };

      categoryRepo.findOne.mockResolvedValue(categoryWithChildren as any);

      await expect(service.remove('category-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('category-uuid-1')).rejects.toThrow(
        'Cannot delete a category with children. Please delete or move children first.',
      );
    });

    // CAT-TC27: Invalid ID format tested by DTO
    // CAT-TC28: Permission denied tested by guard
    // CAT-TC29: No authentication tested by guard
  });
});
