import { Prisma, PurchaseOrder } from '@prisma/client';

export interface IPurchaseOrderRepository {
  findById(id: string): Promise<PurchaseOrder | null>;

  findByPoNo(poNo: string): Promise<PurchaseOrder | null>;

  createDraft(
    data: Prisma.PurchaseOrderCreateInput,
    items?: Omit<Prisma.PurchaseOrderItemCreateManyInput, 'purchaseOrderId'>[],
  ): Promise<PurchaseOrder>;

  updateTotals(poId: string): Promise<PurchaseOrder>;

  submit(poId: string): Promise<PurchaseOrder>;

  findItemsByIds(poId: string, itemIds: string[]): Promise<any[]>;

  receiveItems(
    poId: string,
    increments: { poItemId: string; qtyInc: number }[],
  ): Promise<{ po: PurchaseOrder; newBatches: any[] }>;

  findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PurchaseOrderWhereInput;
    include?: Prisma.PurchaseOrderInclude;
    orderBy?: Prisma.PurchaseOrderOrderByWithRelationInput[];
  }): Promise<PurchaseOrder[]>;

  count(where?: Prisma.PurchaseOrderWhereInput): Promise<number>;

  update(id: string, data: Prisma.PurchaseOrderUpdateInput): Promise<PurchaseOrder>;

  delete(id: string): Promise<PurchaseOrder>;
}
