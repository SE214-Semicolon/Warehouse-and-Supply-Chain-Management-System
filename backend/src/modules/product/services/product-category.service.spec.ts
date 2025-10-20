// import { Test, TestingModule } from '@nestjs/testing';
// import { ProductCategoryService } from '../services/product-category.service';
// import { ProductCategoryRepository } from '../repositories/product-category.repository';
// import { NotFoundException, BadRequestException } from '@nestjs/common';

// describe('ProductCategoryService', () => {
//   let service: ProductCategoryService;

//   const mockCategoryRepository = {
//     create: jest.fn(),
//     findAll: jest.fn(),
//     findOne: jest.fn(),
//     update: jest.fn(),
//     delete: jest.fn(),
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         ProductCategoryService,
//         {
//           provide: ProductCategoryRepository,
//           useValue: mockCategoryRepository,
//         },
//       ],
//     }).compile();

//     service = module.get<ProductCategoryService>(ProductCategoryService);
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   describe('create', () => {
//     it('should create a root category successfully', async () => {
//       const createDto = { name: 'Electronics' };
//       const expectedResult = { id: '1', ...createDto, parentId: null };
//       mockCategoryRepository.create.mockResolvedValue(expectedResult);

//       const result = await service.create(createDto);
//       expect(result).toEqual(expectedResult);
//       expect(mockCategoryRepository.create).toHaveBeenCalledWith(createDto);
//     });

//     it('should create a child category successfully', async () => {
//       const createDto = { name: 'Laptops', parentId: '1' };
//       const parentCategory = { id: '1', name: 'Electronics', parentId: null };
//       const expectedResult = { id: '2', ...createDto };

//       mockCategoryRepository.findOne.mockResolvedValue(parentCategory);
//       mockCategoryRepository.create.mockResolvedValue(expectedResult);

//       const result = await service.create(createDto);
//       expect(result).toEqual(expectedResult);
//       expect(mockCategoryRepository.findOne).toHaveBeenCalledWith('1');
//       expect(mockCategoryRepository.create).toHaveBeenCalledWith(createDto);
//     });

//     it('should throw NotFoundException if parent does not exist', async () => {
//       const createDto = { name: 'Laptops', parentId: '999' };
//       mockCategoryRepository.findOne.mockResolvedValue(null);

//       await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
//     });
//   });

//   describe('findAll', () => {
//     it('should return a tree of categories', async () => {
//       const categories = [
//         { id: '1', name: 'Electronics', parentId: null },
//         { id: '2', name: 'Laptops', parentId: '1' },
//         { id: '3', name: 'Smartphones', parentId: '1' },
//         { id: '4', name: 'Gaming Laptops', parentId: '2' },
//       ];
//       mockCategoryRepository.findAll.mockResolvedValue(categories);

//       const expectedTree = [
//         {
//           id: '1',
//           name: 'Electronics',
//           parentId: null,
//           children: [
//             {
//               id: '2',
//               name: 'Laptops',
//               parentId: '1',
//               children: [
//                 {
//                   id: '4',
//                   name: 'Gaming Laptops',
//                   parentId: '2',
//                   children: [],
//                 },
//               ],
//             },
//             {
//               id: '3',
//               name: 'Smartphones',
//               parentId: '1',
//               children: [],
//             },
//           ],
//         },
//       ];

//       const result = await service.findAll();
//       expect(result).toEqual(expectedTree);
//     });
//   });

//   describe('remove', () => {
//     it('should remove a category successfully', async () => {
//       const category = { id: '1', name: 'Electronics', children: [] };
//       mockCategoryRepository.findOne.mockResolvedValue(category);
//       mockCategoryRepository.delete.mockResolvedValue(category);

//       await service.remove('1');
//       expect(mockCategoryRepository.delete).toHaveBeenCalledWith('1');
//     });

//     it('should throw NotFoundException if category to remove is not found', async () => {
//       mockCategoryRepository.findOne.mockResolvedValue(null);
//       await expect(service.remove('999')).rejects.toThrow(NotFoundException);
//     });

//     it('should throw BadRequestException if category has children', async () => {
//       const categoryWithChildren = { id: '1', name: 'Electronics', children: [{ id: '2' }] };
//       mockCategoryRepository.findOne.mockResolvedValue(categoryWithChildren);

//       await expect(service.remove('1')).rejects.toThrow(BadRequestException);
//     });
//   });
// });
