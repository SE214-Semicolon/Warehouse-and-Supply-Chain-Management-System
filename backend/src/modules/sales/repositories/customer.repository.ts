import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma, Customer } from '@prisma/client';

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }

  async findById(id: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  async findUnique(where: Prisma.CustomerWhereUniqueInput): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CustomerWhereInput;
    orderBy?: Prisma.CustomerOrderByWithRelationInput[];
  }): Promise<Customer[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.customer.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  async count(where?: Prisma.CustomerWhereInput): Promise<number> {
    return this.prisma.customer.count({ where });
  }

  async countActiveSalesOrders(customerId: string): Promise<number> {
    return this.prisma.salesOrder.count({
      where: {
        customerId,
        status: {
          notIn: ['closed', 'cancelled'],
        },
      },
    });
  }

  async update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return this.prisma.customer.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Customer> {
    return this.prisma.customer.delete({ where: { id } });
  }
}
