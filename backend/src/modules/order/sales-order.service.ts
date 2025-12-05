import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrderRepository } from './repositories/sales-order.repository';
import { CreateSalesOrderDto } from './dto/create-so.dto';
import { UpdateSalesOrderDto } from './dto/update-so.dto';
import { SubmitSalesOrderDto } from './dto/submit-so.dto';
import { FulfillSalesOrderDto } from './dto/fulfill-so.dto';
import { QuerySalesOrderDto } from './dto/query-so.dto';
import { InventoryService } from '../inventory/services/inventory.service';
import { DispatchInventoryDto } from '../inventory/dto/dispatch-inventory.dto';
import { OrderStatus, SalesOrder, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class SalesOrderService {
  constructor(
    private readonly soRepo: SalesOrderRepository,
    private readonly inventorySvc: InventoryService,
  ) {}

  private generateSONo(): string {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const rand = randomUUID().slice(0, 6).toUpperCase();
    return `SO-${y}${m}-${rand}`;
  }

  async createSalesOrder(dto: CreateSalesOrderDto, createdById: string): Promise<SalesOrder> {
    const soNo = this.generateSONo();
    const items: Omit<Prisma.SalesOrderItemCreateManyInput, 'salesOrderId'>[] = (
      dto.items ?? []
    ).map((it) => ({
      productId: it.productId,
      productBatchId: it.productBatchId ?? null,
      qty: it.qty,
      unitPrice: it.unitPrice ?? null,
      lineTotal: it.unitPrice ? it.unitPrice * it.qty : null,
    }));

    const so = await this.soRepo.createDraft(
      {
        soNo,
        customer: dto.customerId ? { connect: { id: dto.customerId } } : undefined,
        status: OrderStatus.pending,
        placedAt: dto.placedAt ? new Date(dto.placedAt) : undefined,
        createdBy: { connect: { id: createdById } },
      },
      items,
    );

    await this.soRepo.updateTotals(so.id);
    const created = await this.soRepo.findById(so.id);
    if (!created) throw new NotFoundException('SO not found after creation');
    return created;
  }

  async submitSalesOrder(id: string, dto: SubmitSalesOrderDto) {
    if (!dto?.userId) {
      throw new BadRequestException('userId is required');
    }
    const so = await this.soRepo.findById(id);
    if (!so) throw new NotFoundException('SO not found');
    if (so.status !== OrderStatus.pending) {
      throw new BadRequestException('Only pending SO can be submitted');
    }
    await this.soRepo.submit(id);
    const updated = await this.soRepo.findById(id);
    if (!updated) throw new NotFoundException('SO not found after submit');
    return updated;
  }

  async findById(id: string) {
    const so = await this.soRepo.findById(id);
    if (!so) throw new NotFoundException('SO not found');
    return so;
  }

  async list(query: QuerySalesOrderDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SalesOrderWhereInput = {};
    if (query.soNo) where.soNo = { contains: query.soNo, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.dateFrom || query.dateTo) {
      const placedAtFilter: Prisma.DateTimeNullableFilter = {};
      if (query.dateFrom) {
        placedAtFilter.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        placedAtFilter.lte = new Date(query.dateTo);
      }
      where.placedAt = placedAtFilter;
    }

    const orderBy: Prisma.SalesOrderOrderByWithRelationInput[] = [];
    for (const part of (query.sort ?? 'placedAt:desc').split(',')) {
      const [field, dir] = part.split(':');
      if (!field) continue;
      orderBy.push({
        [field]: dir === 'asc' ? 'asc' : 'desc',
      } as Prisma.SalesOrderOrderByWithRelationInput);
    }

    const { data, total } = await this.soRepo.list({ skip, take: pageSize, where, orderBy });
    return { data, total, page, pageSize };
  }

  async updateSalesOrder(id: string, dto: UpdateSalesOrderDto) {
    const so = await this.soRepo.findById(id);
    if (!so) throw new NotFoundException('SO not found');
    if (so.status !== OrderStatus.pending) {
      throw new BadRequestException('Only pending SO can be updated');
    }

    const updateData: Prisma.SalesOrderUpdateInput = {};
    if (dto.customerId) updateData.customer = { connect: { id: dto.customerId } };
    if (dto.placedAt) updateData.placedAt = new Date(dto.placedAt);

    await this.soRepo.update(id, updateData);

    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        if (item.id) {
          const existingItem = await this.soRepo.getItemById(item.id);
          if (!existingItem || existingItem.salesOrderId !== id) {
            throw new BadRequestException(`Item ${item.id} not found in this SO`);
          }

          const itemUpdateData: Prisma.SalesOrderItemUpdateInput = {};
          if (item.productId) itemUpdateData.product = { connect: { id: item.productId } };
          if (item.qty !== undefined) itemUpdateData.qty = item.qty;
          if (item.unitPrice !== undefined) {
            itemUpdateData.unitPrice = item.unitPrice;
            itemUpdateData.lineTotal = item.unitPrice * (item.qty ?? existingItem.qty);
          }

          await this.soRepo.updateItem(item.id, itemUpdateData);
        }
      }
    }

    await this.soRepo.updateTotals(id);
    const updated = await this.soRepo.findById(id);
    if (!updated) throw new NotFoundException('SO not found after update');
    return updated;
  }

  async fulfillSalesOrder(soId: string, dto: FulfillSalesOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('No items to fulfill');
    }

    const so = await this.soRepo.findById(soId);
    if (!so) throw new NotFoundException('SO not found');
    if (!(so.status === OrderStatus.approved || so.status === OrderStatus.processing)) {
      throw new BadRequestException('SO status is not eligible for fulfillment');
    }

    const targetIds = dto.items.map((i) => i.soItemId);
    const existing = await this.soRepo.findItemsByIds(soId, targetIds);
    if (existing.length !== targetIds.length) {
      throw new BadRequestException('Some items not found in SO');
    }

    // Validate qtyToFulfill không vượt quá qty còn lại chưa fulfill
    for (const r of dto.items) {
      const item = existing.find((e) => e.id === r.soItemId)!;
      const remainingQty = item.qty - item.qtyFulfilled;
      if (r.qtyToFulfill > remainingQty) {
        throw new BadRequestException(
          `Fulfill quantity ${r.qtyToFulfill} exceeds remaining quantity ${remainingQty} for item ${item.id}`,
        );
      }
    }

    // Dispatch inventory for each item
    for (const r of dto.items) {
      const payload: DispatchInventoryDto = {
        productBatchId: r.productBatchId,
        locationId: r.locationId,
        quantity: r.qtyToFulfill,
        createdById: r.createdById,
        idempotencyKey: r.idempotencyKey,
      };
      await this.inventorySvc.dispatchInventory(payload);

      // Update qtyFulfilled for item
      await this.soRepo.updateItemFulfilled(r.soItemId, r.qtyToFulfill);
    }

    // Recalculate SO status based on fulfillment progress
    const updatedItems = await this.soRepo.findItemsByIds(soId, targetIds);
    const allItemsFullyFulfilled = updatedItems.every((item) => item.qtyFulfilled >= item.qty);
    const anyItemsFulfilled = updatedItems.some((item) => item.qtyFulfilled > 0);

    let newStatus: OrderStatus;
    if (allItemsFullyFulfilled) {
      newStatus = OrderStatus.shipped;
    } else if (anyItemsFulfilled) {
      newStatus = OrderStatus.processing;
    } else {
      newStatus = so.status; // Keep current status
    }

    await this.soRepo.updateStatus(soId, newStatus);

    const updated = await this.soRepo.findById(soId);
    if (!updated) throw new NotFoundException('SO not found after fulfillment');
    return updated;
  }

  async cancelSalesOrder(id: string) {
    const so = await this.soRepo.findById(id);
    if (!so) throw new NotFoundException('SO not found');
    if (so.status === OrderStatus.shipped || so.status === OrderStatus.cancelled) {
      throw new BadRequestException(`Cannot cancel SO with status: ${so.status}`);
    }

    await this.soRepo.cancel(id);
    const updated = await this.soRepo.findById(id);
    if (!updated) throw new NotFoundException('SO not found after cancel');
    return updated;
  }
}
