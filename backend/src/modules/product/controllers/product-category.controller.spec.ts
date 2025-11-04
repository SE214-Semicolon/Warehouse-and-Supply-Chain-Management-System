import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategoryController } from './product-category.controller';
import { ProductCategoryService } from '../services/product-category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

describe('ProductCategoryController', () => {
  let controller: ProductCategoryController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductCategoryController],
      providers: [{ provide: ProductCategoryService, useValue: mockService }],
    }).compile();

    controller = module.get<ProductCategoryController>(ProductCategoryController);
    jest.clearAllMocks();
  });

  it('should call create on service and return result', async () => {
    const dto: CreateCategoryDto = { name: 'Electronics' } as any;
    const serviceResult = {
      success: true,
      data: { id: 'c1', name: 'Electronics', parentId: null },
    };
    mockService.create.mockResolvedValue(serviceResult);

    const res = await controller.create(dto);

    expect(mockService.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should call findAll on service and return result', async () => {
    const serviceResult = {
      success: true,
      data: [{ id: 'c1', name: 'Root', children: [] }],
      total: 1,
    };
    mockService.findAll.mockResolvedValue(serviceResult);

    const res = await controller.findAll();

    expect(mockService.findAll).toHaveBeenCalled();
    expect(res).toEqual(serviceResult);
  });

  it('should call findOne on service and return result', async () => {
    const serviceResult = { success: true, data: { id: 'c1', name: 'Root' } };
    mockService.findOne.mockResolvedValue(serviceResult);

    const res = await controller.findOne('c1');

    expect(mockService.findOne).toHaveBeenCalledWith('c1');
    expect(res).toEqual(serviceResult);
  });

  it('should call update on service and return result', async () => {
    const dto: UpdateCategoryDto = { name: 'New' } as any;
    const serviceResult = { success: true, data: { id: 'c1', name: 'New' } };
    mockService.update.mockResolvedValue(serviceResult);

    const res = await controller.update('c1', dto);

    expect(mockService.update).toHaveBeenCalledWith('c1', dto);
    expect(res).toEqual(serviceResult);
  });

  it('should call remove on service and return result', async () => {
    const serviceResult = { success: true, message: 'deleted' };
    mockService.remove.mockResolvedValue(serviceResult);

    const res = await controller.remove('c1');

    expect(mockService.remove).toHaveBeenCalledWith('c1');
    expect(res).toEqual(serviceResult);
  });
});
