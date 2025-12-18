import { Prisma, Customer } from '@prisma/client';

export interface ICustomerRepository {
  create(data: Prisma.CustomerCreateInput): Promise<Customer>;

  findById(id: string): Promise<Customer | null>;

  findUnique(where: Prisma.CustomerWhereUniqueInput): Promise<Customer | null>;

  findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CustomerWhereInput;
    orderBy?: Prisma.CustomerOrderByWithRelationInput[];
  }): Promise<Customer[]>;

  count(where?: Prisma.CustomerWhereInput): Promise<number>;

  countActiveSalesOrders(customerId: string): Promise<number>;

  update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer>;

  remove(id: string): Promise<Customer>;
}
