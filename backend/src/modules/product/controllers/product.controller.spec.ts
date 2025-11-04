import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { QueryProductDto } from '../dto/query-product.dto';

describe('ProductController', () => {
  let controller: ProductController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySku: jest.fn(),
    findByBarcode: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    autocomplete: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockService }],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    jest.clearAllMocks();
  });

  it('should call create on service and return result', async () => {
    const dto: CreateProductDto = {
      name: 'N1',
      sku: 'SKU-1',
      unit: 'pcs',
      barcode: 'BC',
      parameters: {},
      categoryId: 'cat-1',
    } as any;
    const serviceResult = { success: true, data: { id: 'p1', ...dto } };
    mockService.create.mockResolvedValue(serviceResult);

    const res = await controller.create(dto);

    expect(mockService.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should call findAll on service and return result', async () => {
    const query: QueryProductDto = { page: 1, limit: 10 } as any;
    const serviceResult = { success: true, data: [{ id: 'p1' }], total: 1, page: 1, limit: 10 };
    mockService.findAll.mockResolvedValue(serviceResult);

    const res = await controller.findAll(query);

    expect(mockService.findAll).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should call findOne on service and return result', async () => {
    const serviceResult = { success: true, data: { id: 'p1' } };
    mockService.findOne.mockResolvedValue(serviceResult);

    const res = await controller.findOne('p1');

    expect(mockService.findOne).toHaveBeenCalledWith('p1');
    expect(res).toEqual(serviceResult);
  });

  it('should call update on service and return result', async () => {
    const dto: UpdateProductDto = { name: 'N2' } as any;
    const serviceResult = { success: true, data: { id: 'p1', name: 'N2' } };
    mockService.update.mockResolvedValue(serviceResult);

    const res = await controller.update('p1', dto);

    expect(mockService.update).toHaveBeenCalledWith('p1', dto);
    expect(res).toEqual(serviceResult);
  });

  it('should call remove on service and return result', async () => {
    const serviceResult = { success: true, message: 'ok' };
    mockService.remove.mockResolvedValue(serviceResult);

    const res = await controller.remove('p1');

    expect(mockService.remove).toHaveBeenCalledWith('p1');
    expect(res).toEqual(serviceResult);
  });

  it('should call findBySku and findByBarcode', async () => {
    const bySku = { success: true, data: { id: 'p1' } };
    const byBarcode = { success: true, data: { id: 'p2' } };
    mockService.findBySku.mockResolvedValue(bySku);
    mockService.findByBarcode.mockResolvedValue(byBarcode);

    const r1 = await controller.findBySku('SKU-1');
    const r2 = await controller.findByBarcode('BC-1');

    expect(mockService.findBySku).toHaveBeenCalledWith('SKU-1');
    expect(mockService.findByBarcode).toHaveBeenCalledWith('BC-1');
    expect(r1).toEqual(bySku);
    expect(r2).toEqual(byBarcode);
  });

  it('should call autocomplete', async () => {
    const serviceResult = [{ id: 'p1', name: 'A' }];
    mockService.autocomplete.mockResolvedValue(serviceResult);
    const res = await controller.autocomplete('A', 5 as any);
    expect(mockService.autocomplete).toHaveBeenCalledWith('A', 5);
    expect(res).toEqual(serviceResult);
  });
});
