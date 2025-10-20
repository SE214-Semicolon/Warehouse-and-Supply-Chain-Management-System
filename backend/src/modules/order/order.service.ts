import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseOrderRepository } from './repositories/purchase-order.repository';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { SubmitPurchaseOrderDto } from './dto/submit-po.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-po.dto';
import { InventoryService } from '../inventory/services/inventory.service';
import { ReceiveInventoryDto } from '../inventory/dto/receive-inventory.dto';
import { QueryPurchaseOrderDto } from './dto/query-po.dto';
import { PoStatus, PurchaseOrder, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class OrderService {
  constructor(
    private readonly poRepo: PurchaseOrderRepository,
    private readonly inventorySvc: InventoryService,
  ) {}

  private generatePoNo(): string {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const rand = randomUUID().slice(0, 6).toUpperCase();
    return `PO-${y}${m}-${rand}`;
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const poNo = this.generatePoNo();
    const items: Omit<Prisma.PurchaseOrderItemCreateManyInput, 'purchaseOrderId'>[] = (
      dto.items ?? []
    ).map((it) => ({
      productId: it.productId,
      qtyOrdered: it.qtyOrdered,
      unitPrice: it.unitPrice ?? null,
      lineTotal: it.unitPrice ? it.unitPrice * it.qtyOrdered : null,
      remark: it.remark ?? null,
    }));

    const po = await this.poRepo.createDraft(
      {
        poNo,
        supplier: dto.supplierId ? { connect: { id: dto.supplierId } } : undefined,
        status: PoStatus.draft,
        placedAt: dto.placedAt ? new Date(dto.placedAt) : undefined,
        expectedArrival: dto.expectedArrival ? new Date(dto.expectedArrival) : undefined,
        notes: dto.notes,
        createdBy: dto.createdById ? { connect: { id: dto.createdById } } : undefined,
      },
      items,
    );

    await this.poRepo.updateTotals(po.id);
    const created = await this.poRepo.findById(po.id);
    if (!created) throw new NotFoundException('PO not found after creation');
    return created;
  }

  async submitPurchaseOrder(id: string, dto: SubmitPurchaseOrderDto) {
    if (!dto?.userId) {
      throw new BadRequestException('userId is required');
    }
    const po = await this.poRepo.findById(id);
    if (!po) throw new NotFoundException('PO not found');
    if (po.status !== PoStatus.draft) throw new BadRequestException('Only draft can be submitted');
    await this.poRepo.submit(id);
    const updated = await this.poRepo.findById(id);
    if (!updated) throw new NotFoundException('PO not found after submit');
    return updated;
  }

  async findById(id: string) {
    const po = await this.poRepo.findById(id);
    if (!po) throw new NotFoundException('PO not found');
    return po;
  }

  async receivePurchaseOrder(poId: string, dto: ReceivePurchaseOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('No items to receive');
    }

    // Kiểm tra trạng thái PO cho phép nhận
    const poBefore = await this.poRepo.findById(poId);
    if (!poBefore) throw new NotFoundException('PO not found');
    if (!(poBefore.status === PoStatus.ordered || poBefore.status === PoStatus.partial)) {
      throw new BadRequestException('PO status is not eligible for receiving');
    }

    // 1) Kiểm tra với các dòng sản phẩm PO và tính toán increment
    const targetIds = dto.items.map((i) => i.poItemId);
    const existing = await this.poRepo.findItemsByIds(poId, targetIds);
    if (existing.length !== targetIds.length) {
      throw new BadRequestException('Some items not found in PO');
    }

    const increments: { poItemId: string; qtyInc: number }[] = [];
    for (const r of dto.items) {
      const item = existing.find((e) => e.id === r.poItemId)!;
      if (item.qtyReceived + r.qtyToReceive > item.qtyOrdered) {
        throw new BadRequestException('Receive exceeds ordered quantity');
      }
      increments.push({ poItemId: r.poItemId, qtyInc: r.qtyToReceive });
    }

    // 2) Gọi Inventory receive cho từng dòng (idempotent được xử lý bởi Inventory)
    for (const r of dto.items) {
      const payload: ReceiveInventoryDto = {
        productBatchId: r.productBatchId,
        locationId: r.locationId,
        quantity: r.qtyToReceive,
        createdById: r.createdById,
        idempotencyKey: r.idempotencyKey,
      };
      await this.inventorySvc.receiveInventory(payload);
    }

    // 3) Cập nhật qtyReceived và trạng thái PO trong transaction
    let updatedPo: PurchaseOrder;
    try {
      updatedPo = await this.poRepo.receiveItems(poId, increments);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === 'PO_STATUS_INVALID') {
          throw new BadRequestException('PO status is not eligible for receiving');
        }
        if (e.message === 'ITEM_NOT_FOUND') {
          throw new BadRequestException('PO item not found');
        }
        if (e.message === 'OVER_RECEIVE') {
          throw new BadRequestException('Receive exceeds ordered quantity');
        }
      }
      throw e;
    }
    const result = await this.poRepo.findById(updatedPo.id);
    if (!result) throw new NotFoundException('PO not found after receive');
    return result;
  }

  async list(query: QueryPurchaseOrderDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PurchaseOrderWhereInput = {};
    if (query.poNo) where.poNo = { contains: query.poNo, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;
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

    const orderBy: Prisma.PurchaseOrderOrderByWithRelationInput[] = [];
    for (const part of (query.sort ?? 'placedAt:desc').split(',')) {
      const [field, dir] = part.split(':');
      if (!field) continue;
      orderBy.push({
        [field]: dir === 'asc' ? 'asc' : 'desc',
      } as Prisma.PurchaseOrderOrderByWithRelationInput);
    }

    const { data, total } = await this.poRepo.list({ skip, take: pageSize, where, orderBy });
    return { data, total, page, pageSize };
  }
}
