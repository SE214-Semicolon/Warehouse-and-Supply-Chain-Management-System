import { Prisma, SalesOrder } from '@prisma/client';

export interface ISalesOrderRepository {
  findById(id: string): Promise<SalesOrder | null>;

  findBySONo(soNo: string): Promise<SalesOrder | null>;

  createDraft(
    data: Prisma.SalesOrderCreateInput,
    items?: Omit<Prisma.SalesOrderItemCreateManyInput, 'salesOrderId'>[],
  ): Promise<SalesOrder>;

  updateTotals(soId: string): Promise<SalesOrder>;

  submit(soId: string): Promise<SalesOrder>;

  findItemsByIds(soId: string, itemIds: string[]): Promise<any[]>;

  list(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SalesOrderWhereInput;
    orderBy?: Prisma.SalesOrderOrderByWithRelationInput[];
  }): Promise<{ data: SalesOrder[]; total: number }>;

  update(id: string, data: Prisma.SalesOrderUpdateInput): Promise<SalesOrder>;

  delete(id: string): Promise<SalesOrder>;
}
