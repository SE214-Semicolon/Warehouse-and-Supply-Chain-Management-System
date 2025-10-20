// import { Test, TestingModule } from '@nestjs/testing';
// import { InventoryService } from './inventory.service';
// import { InventoryRepository } from '../repositories/inventory.repository';
// import { BadRequestException, NotFoundException } from '@nestjs/common';
// import { AdjustInventoryDto, AdjustmentReason } from '../dto/adjust-inventory.dto';
// import { TransferInventoryDto } from '../dto/transfer-inventory.dto';

// describe('InventoryService', () => {
//   let service: InventoryService;
//   let repo: Partial<InventoryRepository>;

//   beforeEach(async () => {
//     repo = {
//       findMovementByKey: jest.fn(),
//       receiveInventoryTx: jest.fn(),
//       findInventory: jest.fn(),
//       dispatchInventoryTx: jest.fn(),
//       adjustInventoryTx: jest.fn(),
//       transferInventoryTx: jest.fn(),
//       findProductBatch: jest.fn().mockResolvedValue({ id: 'pb1' }),
//       findLocation: jest.fn().mockResolvedValue({ id: 'loc1' }),
//       findUser: jest.fn().mockResolvedValue({ id: 'user1' }),
//     };

//     const module: TestingModule = await Test.createTestingModule({
//       providers: [InventoryService, { provide: InventoryRepository, useValue: repo }],
//     }).compile();

//     service = module.get<InventoryService>(InventoryService);
//   });

//   describe('receiveInventory', () => {
//     it('should return existing movement if idempotencyKey already used', async () => {
//       (repo.findMovementByKey as jest.Mock).mockResolvedValue({ id: '123' });

//       const result = await service.receiveInventory({
//         productBatchId: 'pb1',
//         locationId: 'loc1',
//         quantity: 10,
//         createdById: 'user1',
//         idempotencyKey: 'key1',
//       });

//       expect(result.success).toBe(true);
//       expect(result.idempotent).toBe(true);
//     });

//     it('should create new inventory and movement', async () => {
//       (repo.findMovementByKey as jest.Mock).mockResolvedValue(null);
//       (repo.receiveInventoryTx as jest.Mock).mockResolvedValue({
//         inventory: { id: 'inv1' },
//         movement: { id: 'move1' },
//       });

//       const result = await service.receiveInventory({
//         productBatchId: 'pb1',
//         locationId: 'loc1',
//         quantity: 10,
//         createdById: 'user1',
//       });

//       expect(result.inventory!.id).toBe('inv1');
//       expect(result.movement.id).toBe('move1');
//     });
//   });

//   describe('dispatchInventory', () => {
//     it('should throw if not enough stock', async () => {
//       // simulate dispatchInventoryTx throwing NotEnoughStock -> service maps to BadRequestException
//       (repo.dispatchInventoryTx as jest.Mock).mockRejectedValue(new Error('NotEnoughStock'));

//       await expect(
//         service.dispatchInventory({
//           productBatchId: 'pb1',
//           locationId: 'loc1',
//           quantity: 10,
//           createdById: 'user1',
//         }),
//       ).rejects.toThrow(BadRequestException);
//     });

//     it('should decrease stock and create movement', async () => {
//       (repo.dispatchInventoryTx as jest.Mock).mockResolvedValue({
//         inventory: { id: 'inv2' },
//         movement: { id: 'move2' },
//       });

//       const result = await service.dispatchInventory({
//         productBatchId: 'pb1',
//         locationId: 'loc1',
//         quantity: 10,
//         createdById: 'user1',
//       });

//       expect(result.inventory!.id).toBe('inv2');
//       expect(result.movement.id).toBe('move2');
//     });
//   });

//   describe('adjustInventory', () => {
//     const adjustDto: AdjustInventoryDto = {
//       productBatchId: 'pb1',
//       locationId: 'loc1',
//       adjustmentQuantity: 5,
//       createdById: 'user1',
//       idempotencyKey: 'adjust-key1',
//       reason: AdjustmentReason.COUNT_ERROR,
//       note: 'Found extra items during count',
//     };

//     it('should throw NotFoundException if productBatch not found', async () => {
//       (repo.findProductBatch as jest.Mock).mockResolvedValue(null);

//       await expect(service.adjustInventory(adjustDto)).rejects.toThrow(NotFoundException);
//     });

//     it('should throw NotFoundException if location not found', async () => {
//       (repo.findProductBatch as jest.Mock).mockResolvedValue({ id: 'pb1' });
//       (repo.findLocation as jest.Mock).mockResolvedValue(null);

//       await expect(service.adjustInventory(adjustDto)).rejects.toThrow(NotFoundException);
//     });

//     it('should throw NotFoundException if user not found', async () => {
//       (repo.findUser as jest.Mock).mockResolvedValue(null);

//       await expect(service.adjustInventory(adjustDto)).rejects.toThrow(NotFoundException);
//     });

//     it('should throw BadRequestException if adjustment quantity is zero', async () => {
//       const zeroAdjustDto = { ...adjustDto, adjustmentQuantity: 0 };

//       await expect(service.adjustInventory(zeroAdjustDto)).rejects.toThrow(BadRequestException);
//     });

//     it('should return existing movement if idempotencyKey already used', async () => {
//       (repo.findMovementByKey as jest.Mock).mockResolvedValue({ id: 'existing-move' });

//       const result = await service.adjustInventory(adjustDto);

//       expect(result.success).toBe(true);
//       expect(result.idempotent).toBe(true);
//       expect(result.movement.id).toBe('existing-move');
//       expect(repo.adjustInventoryTx).not.toHaveBeenCalled();
//     });

//     it('should adjust inventory and create movement', async () => {
//       (repo.findMovementByKey as jest.Mock).mockResolvedValue(null);
//       (repo.adjustInventoryTx as jest.Mock).mockResolvedValue({
//         inventory: { id: 'inv3' },
//         movement: { id: 'move3' },
//       });

//       const result = await service.adjustInventory(adjustDto);

//       expect(result.success).toBe(true);
//       expect(result.inventory!.id).toBe('inv3');
//       expect(result.movement.id).toBe('move3');
//       expect(repo.adjustInventoryTx).toHaveBeenCalledWith(
//         'pb1',
//         'loc1',
//         5,
//         'user1',
//         'adjust-key1',
//         AdjustmentReason.COUNT_ERROR,
//         'Found extra items during count',
//       );
//     });

//     it('should handle concurrent idempotency key creation', async () => {
//       (repo.findMovementByKey as jest.Mock).mockResolvedValue(null);
//       (repo.adjustInventoryTx as jest.Mock).mockRejectedValue(
//         new Error('Unique constraint failed on the fields: (`idempotencyKey`)'),
//       );
//       (repo.findMovementByKey as jest.Mock).mockResolvedValueOnce({ id: 'concurrent-move' });

//       const result = await service.adjustInventory(adjustDto);

//       expect(result.success).toBe(true);
//       expect(result.idempotent).toBe(true);
//       expect(result.movement.id).toBe('concurrent-move');
//     });
//   });

//   describe('transferInventory', () => {
//     const transferDto: TransferInventoryDto = {
//       productBatchId: 'pb1',
//       fromLocationId: 'loc1',
//       toLocationId: 'loc2',
//       quantity: 10,
//       createdById: 'user1',
//       idempotencyKey: 'transfer-key1',
//       note: 'Moving to different section',
//     };

//     it('should throw NotFoundException if productBatch not found', async () => {
//       (repo.findProductBatch as jest.Mock).mockResolvedValue(null);

//       await expect(service.transferInventory(transferDto)).rejects.toThrow(NotFoundException);
//     });

//     it('should throw NotFoundException if from location not found', async () => {
//       (repo.findProductBatch as jest.Mock).mockResolvedValue({ id: 'pb1' });
//       (repo.findLocation as jest.Mock).mockResolvedValueOnce(null);

//       await expect(service.transferInventory(transferDto)).rejects.toThrow(NotFoundException);
//     });

//     it('should throw NotFoundException if to location not found', async () => {
//       (repo.findLocation as jest.Mock)
//         .mockResolvedValueOnce({ id: 'loc1' }) // from location
//         .mockResolvedValueOnce(null); // to location

//       await expect(service.transferInventory(transferDto)).rejects.toThrow(NotFoundException);
//     });

//     it('should throw BadRequestException if source and destination are same', async () => {
//       const sameLocationDto = { ...transferDto, toLocationId: 'loc1' };

//       await expect(service.transferInventory(sameLocationDto)).rejects.toThrow(BadRequestException);
//     });

//     it('should throw BadRequestException if not enough stock', async () => {
//       (repo.transferInventoryTx as jest.Mock).mockRejectedValue(new Error('NotEnoughStock'));

//       await expect(service.transferInventory(transferDto)).rejects.toThrow(BadRequestException);
//     });

//     it('should return existing movement if idempotencyKey already used', async () => {
//       (repo.findMovementByKey as jest.Mock).mockResolvedValue({ id: 'existing-transfer' });

//       const result = await service.transferInventory(transferDto);

//       expect(result.success).toBe(true);
//       expect(result.idempotent).toBe(true);
//       expect((result as any).movement.id).toBe('existing-transfer');
//       expect(repo.transferInventoryTx).not.toHaveBeenCalled();
//     });

//     it('should transfer inventory between locations', async () => {
//       (repo.findMovementByKey as jest.Mock).mockResolvedValue(null);
//       (repo.transferInventoryTx as jest.Mock).mockResolvedValue({
//         fromInventory: { id: 'from-inv' },
//         toInventory: { id: 'to-inv' },
//         transferOutMovement: { id: 'out-move' },
//         transferInMovement: { id: 'in-move' },
//       });

//       const result = await service.transferInventory(transferDto);

//       expect(result.success).toBe(true);
//       expect(result.fromInventory!.id).toBe('from-inv');
//       expect(result.toInventory!.id).toBe('to-inv');
//       expect((result as any).transferOutMovement.id).toBe('out-move');
//       expect((result as any).transferInMovement.id).toBe('in-move');
//       expect(repo.transferInventoryTx).toHaveBeenCalledWith(
//         'pb1',
//         'loc1',
//         'loc2',
//         10,
//         'user1',
//         'transfer-key1',
//         'Moving to different section',
//       );
//     });

//     it('should handle concurrent idempotency key creation for transfer', async () => {
//       (repo.findMovementByKey as jest.Mock).mockResolvedValue(null);
//       (repo.transferInventoryTx as jest.Mock).mockRejectedValue(
//         new Error('Unique constraint failed on the fields: (`idempotencyKey`)'),
//       );
//       (repo.findMovementByKey as jest.Mock).mockResolvedValueOnce({ id: 'concurrent-transfer' });

//       const result = await service.transferInventory(transferDto);

//       expect(result.success).toBe(true);
//       expect(result.idempotent).toBe(true);
//       expect((result as any).movement.id).toBe('concurrent-transfer');
//     });
//   });
// });
