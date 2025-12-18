import { Test, TestingModule } from '@nestjs/testing';
import { SalesOrderController } from './sales-order.controller';
import { SalesOrderService } from '../services/sales-order.service';
import { CreateSalesOrderDto } from '../dto/sales-order/create-so.dto';
import { UpdateSalesOrderDto } from '../dto/sales-order/update-so.dto';
import { QuerySalesOrderDto } from '../dto/sales-order/query-so.dto';

describe('SalesOrderController', () => {
  let controller: SalesOrderController;

  const mockService = {
    createSalesOrder: jest.fn(),
    submitSalesOrder: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    updateSalesOrder: jest.fn(),
    fulfillSalesOrder: jest.fn(),
    cancelSalesOrder: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesOrderController],
      providers: [{ provide: SalesOrderService, useValue: mockService }],
    }).compile();

    controller = module.get<SalesOrderController>(SalesOrderController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create sales order', async () => {
    const dto: CreateSalesOrderDto = {
      customerId: 'cust1',
      items: [{ productId: 'p1', qty: 5, unitPrice: 100 }],
    } as any;
    const req = { user: { userId: 'user1' } } as any;
    const serviceResult = { success: true, data: { id: 'so1', soNo: 'SO-001' } };
    mockService.createSalesOrder.mockResolvedValue(serviceResult);

    const res = await controller.create(dto, req);

    expect(mockService.createSalesOrder).toHaveBeenCalledWith(dto, 'user1');
    expect(res).toEqual(serviceResult);
  });

  it('should list sales orders', async () => {
    const query: QuerySalesOrderDto = { page: 1 };
    const serviceResult = {
      success: true,
      data: [{ id: 'so1', soNo: 'SO-001' }],
      total: 1,
    };
    mockService.list.mockResolvedValue(serviceResult);

    const res = await controller.list(query);

    expect(mockService.list).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should get sales order by id', async () => {
    const serviceResult = { success: true, data: { id: 'so1', soNo: 'SO-001' } };
    mockService.findById.mockResolvedValue(serviceResult);

    const res = await controller.findOne('so1');

    expect(mockService.findById).toHaveBeenCalledWith('so1');
    expect(res).toEqual(serviceResult);
  });

  it('should submit sales order', async () => {
    const dto = { notes: 'Submit order' } as any;
    const serviceResult = { success: true, message: 'SO submitted' };
    mockService.submitSalesOrder.mockResolvedValue(serviceResult);

    const res = await controller.submit('so1', dto);

    expect(mockService.submitSalesOrder).toHaveBeenCalledWith('so1', dto);
    expect(res).toEqual(serviceResult);
  });
});
