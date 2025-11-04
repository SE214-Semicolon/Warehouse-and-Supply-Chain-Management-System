import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from '../services/inventory.service';
import { ReceiveInventoryDto } from '../dto/receive-inventory.dto';
import { DispatchInventoryDto } from '../dto/dispatch-inventory.dto';

describe('InventoryController', () => {
  let controller: InventoryController;
  const mockService = {
    receiveInventory: jest.fn(),
    dispatchInventory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: mockService }],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it('should call receiveInventory on service', async () => {
    mockService.receiveInventory.mockResolvedValue({ inventory: { id: 'inv' } });
    const dto: ReceiveInventoryDto = { productBatchId: 'pb1', locationId: 'loc1', quantity: 5 };
    const res = await controller.receive(dto);
    expect(mockService.receiveInventory).toHaveBeenCalledWith(dto);
    expect(res.inventory?.id).toBe('inv');
  });

  it('should call dispatchInventory on service', async () => {
    mockService.dispatchInventory.mockResolvedValue({ inventory: { id: 'inv2' } });
    const dto: DispatchInventoryDto = { productBatchId: 'pb1', locationId: 'loc1', quantity: 2 };
    const res = await controller.dispatch(dto);
    expect(mockService.dispatchInventory).toHaveBeenCalledWith(dto);
    expect(res.inventory?.id).toBe('inv2');
  });
});
