import { Injectable } from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma/prisma.service';

@Injectable()
export class SalesOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });
  }

  async findBySONo(soNo: string) {
    return this.prisma.salesOrder.findUnique({ where: { soNo } });
  }

  async createDraft(
    data: Prisma.SalesOrderCreateInput,
    items?: Omit<Prisma.SalesOrderItemCreateManyInput, 'salesOrderId'>[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.create({ data });
      if (items?.length) {
        await tx.salesOrderItem.createMany({
          data: items.map((it) => ({
            salesOrderId: so.id,
            productId: it.productId,
            productBatchId: it.productBatchId ?? null,
            locationId: it.locationId ?? null, // Include locationId for inventory reservation
            qty: it.qty,
            unitPrice: it.unitPrice ?? null,
            lineTotal: it.lineTotal ?? null,
          })),
        });
      }
      return so;
    });
  }

  async updateTotals(soId: string) {
    const items = await this.prisma.salesOrderItem.findMany({
      where: { salesOrderId: soId },
    });
    const total = items.reduce((sum, it) => {
      const unitPriceNumber = it.unitPrice != null ? Number(it.unitPrice) : 0;
      const computedLineTotal = unitPriceNumber * it.qty;
      const lineTotalNumber = it.lineTotal != null ? Number(it.lineTotal) : computedLineTotal;
      return sum + lineTotalNumber;
    }, 0);
    return this.prisma.salesOrder.update({ where: { id: soId }, data: { totalAmount: total } });
  }

  async submit(soId: string) {
    return this.prisma.salesOrder.update({
      where: { id: soId },
      data: { status: OrderStatus.approved },
    });
  }

  async findItemsByIds(soId: string, itemIds: string[]) {
    return this.prisma.salesOrderItem.findMany({
      where: { salesOrderId: soId, id: { in: itemIds } },
    });
  }

  async list(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SalesOrderWhereInput;
    orderBy?: Prisma.SalesOrderOrderByWithRelationInput[];
  }) {
    const { skip, take, where, orderBy } = params;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        skip,
        take,
        where,
        orderBy,
        include: { customer: true },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);
    return { data, total };
  }

  async update(soId: string, data: Prisma.SalesOrderUpdateInput) {
    return this.prisma.salesOrder.update({
      where: { id: soId },
      data,
    });
  }

  async updateItem(itemId: string, data: Prisma.SalesOrderItemUpdateInput) {
    return this.prisma.salesOrderItem.update({
      where: { id: itemId },
      data,
    });
  }

  async getItemById(itemId: string) {
    return this.prisma.salesOrderItem.findUnique({
      where: { id: itemId },
    });
  }

  async markAsShipped(soId: string) {
    return this.prisma.salesOrder.update({
      where: { id: soId },
      data: { status: OrderStatus.shipped },
    });
  }

  async cancel(soId: string) {
    return this.prisma.salesOrder.update({
      where: { id: soId },
      data: { status: OrderStatus.cancelled },
    });
  }

  async updateItemFulfilled(itemId: string, qtyInc: number) {
    const item = await this.prisma.salesOrderItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new Error('SOItemNotFound');
    }
    return this.prisma.salesOrderItem.update({
      where: { id: itemId },
      data: { qtyFulfilled: item.qtyFulfilled + qtyInc },
    });
  }

  async updateStatus(soId: string, status: OrderStatus) {
    return this.prisma.salesOrder.update({
      where: { id: soId },
      data: { status },
    });
  }
}
