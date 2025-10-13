import { Injectable } from '@nestjs/common';
import { Prisma, PoStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, supplier: true },
    });
  }

  async findByPoNo(poNo: string) {
    return this.prisma.purchaseOrder.findUnique({ where: { poNo } });
  }

  async createDraft(
    data: Prisma.PurchaseOrderCreateInput,
    items?: Omit<Prisma.PurchaseOrderItemCreateManyInput, 'purchaseOrderId'>[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({ data });
      if (items?.length) {
        await tx.purchaseOrderItem.createMany({
          data: items.map((it) => ({
            purchaseOrderId: po.id,
            productId: it.productId,
            qtyOrdered: it.qtyOrdered,
            unitPrice: it.unitPrice ?? null,
            lineTotal: it.lineTotal ?? null,
            remark: it.remark ?? null,
            productBatchId: it.productBatchId ?? null,
          })),
        });
      }
      return po;
    });
  }

  async updateTotals(poId: string) {
    // tính lại tổng tiền từ các dòng sản phẩm
    const items = await this.prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: poId },
    });
    const total = items.reduce((sum, it) => {
      const unitPriceNumber = it.unitPrice != null ? Number(it.unitPrice) : 0;
      const computedLineTotal = unitPriceNumber * it.qtyOrdered;
      const lineTotalNumber = it.lineTotal != null ? Number(it.lineTotal) : computedLineTotal;
      return sum + lineTotalNumber;
    }, 0);
    return this.prisma.purchaseOrder.update({ where: { id: poId }, data: { totalAmount: total } });
  }

  async submit(poId: string) {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: PoStatus.ordered },
    });
  }

  async findItemsByIds(poId: string, itemIds: string[]) {
    return this.prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: poId, id: { in: itemIds } },
    });
  }

  async receiveItems(poId: string, increments: { poItemId: string; qtyInc: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      // Kiểm tra PO tồn tại và trạng thái cho phép
      const po = await tx.purchaseOrder.findUnique({ where: { id: poId } });
      if (!po) throw new Error('PO_NOT_FOUND');
      if (!(po.status === PoStatus.ordered || po.status === PoStatus.partial)) {
        throw new Error('PO_STATUS_INVALID');
      }

      // Áp dụng từng increment với kiểm tra giới hạn
      for (const inc of increments) {
        if (!inc.qtyInc || inc.qtyInc <= 0) continue;
        const item = await tx.purchaseOrderItem.findUnique({ where: { id: inc.poItemId } });
        if (!item || item.purchaseOrderId !== poId) throw new Error('ITEM_NOT_FOUND');
        if (item.qtyReceived + inc.qtyInc > item.qtyOrdered) throw new Error('OVER_RECEIVE');
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { qtyReceived: item.qtyReceived + inc.qtyInc },
        });
      }

      // Tính lại trạng thái
      const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } });
      const allReceived = items.every((i) => i.qtyReceived >= i.qtyOrdered && i.qtyOrdered > 0);
      const anyReceived = items.some((i) => i.qtyReceived > 0);
      const nextStatus = allReceived
        ? PoStatus.received
        : anyReceived
          ? PoStatus.partial
          : po.status;

      const updatedPo = await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: nextStatus },
      });

      return updatedPo;
    });
  }

  async list(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PurchaseOrderWhereInput;
    orderBy?: Prisma.PurchaseOrderOrderByWithRelationInput[];
  }) {
    const { skip, take, where, orderBy } = params;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        skip,
        take,
        where,
        orderBy,
        include: { supplier: true },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, total };
  }
}
