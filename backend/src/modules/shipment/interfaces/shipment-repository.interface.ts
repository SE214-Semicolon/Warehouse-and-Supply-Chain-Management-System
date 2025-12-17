import { Prisma, Shipment, ShipmentStatus } from '@prisma/client';

export interface IShipmentRepository {
  create(data: Prisma.ShipmentCreateInput): Promise<Shipment>;

  findById(id: string): Promise<Shipment | null>;

  findByShipmentNo(shipmentNo: string): Promise<Shipment | null>;

  findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ShipmentWhereInput;
    orderBy?: Prisma.ShipmentOrderByWithRelationInput[];
    include?: Prisma.ShipmentInclude;
  }): Promise<Shipment[]>;

  count(where?: Prisma.ShipmentWhereInput): Promise<number>;

  update(id: string, data: Prisma.ShipmentUpdateInput): Promise<Shipment>;

  delete(id: string): Promise<Shipment>;

  updateStatus(id: string, status: ShipmentStatus): Promise<Shipment>;
}
