import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { CreatePurchaseOrderDto } from '../dto/purchase-order/create-po.dto';
import { QueryPurchaseOrderDto } from '../dto/purchase-order/query-po.dto';

describe('PurchaseOrderController', () => {
  let controller: PurchaseOrderController;

  const mockService = {
    createPurchaseOrder: jest.fn(),
    submitPurchaseOrder: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    receivePurchaseOrder: jest.fn(),
    updatePurchaseOrder: jest.fn(),
    cancelPurchaseOrder: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrderController],
      providers: [{ provide: PurchaseOrderService, useValue: mockService }],
    }).compile();

    controller = module.get<PurchaseOrderController>(PurchaseOrderController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create purchase order', async () => {
    const dto: CreatePurchaseOrderDto = {
      supplierId: 's1',
      items: [{ productId: 'p1', qty: 10, unitPrice: 100 }],
    } as any;
    const req = { user: { userId: 'user1' } } as any;
    const serviceResult = { success: true, data: { id: 'po1', poNo: 'PO-001' } };
    mockService.createPurchaseOrder.mockResolvedValue(serviceResult);

    const res = await controller.create(dto, req);

    expect(mockService.createPurchaseOrder).toHaveBeenCalledWith(dto, 'user1');
    expect(res).toEqual(serviceResult);
  });

  it('should list purchase orders', async () => {
    const query: QueryPurchaseOrderDto = { page: 1 };
    const serviceResult = {
      success: true,
      data: [{ id: 'po1', poNo: 'PO-001' }],
      total: 1,
    };
    mockService.list.mockResolvedValue(serviceResult);

    const res = await controller.list(query);

    expect(mockService.list).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should get purchase order by id', async () => {
    const serviceResult = { success: true, data: { id: 'po1', poNo: 'PO-001' } };
    mockService.findById.mockResolvedValue(serviceResult);

    const res = await controller.findOne('po1');

    expect(mockService.findById).toHaveBeenCalledWith('po1');
    expect(res).toEqual(serviceResult);
  });

  it('should submit purchase order', async () => {
    const dto = { expectedDate: new Date() } as any;
    const mockReq = { user: { userId: 'user1' } } as any;
    const serviceResult = { success: true, message: 'PO submitted' };
    mockService.submitPurchaseOrder.mockResolvedValue(serviceResult);

    const res = await controller.submit('po1', dto, mockReq);

    expect(mockService.submitPurchaseOrder).toHaveBeenCalledWith('po1', dto, 'user1');
    expect(res).toEqual(serviceResult);
  });
});
