import { Test, TestingModule } from '@nestjs/testing';
import { ProcurementReportingService } from '../../services/procurement-reporting.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { PoStatus } from '@prisma/client';

describe('ProcurementReportingService', () => {
  let service: ProcurementReportingService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    purchaseOrder: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    supplier: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementReportingService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ProcurementReportingService>(ProcurementReportingService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPOPerformance', () => {
    const mockSupplier = {
      id: 'supplier-1',
      name: 'Test Supplier',
    };

    const mockPO = {
      id: 'po-1',
      poNo: 'PO-2024-001',
      supplierId: 'supplier-1',
      supplier: mockSupplier,
      status: PoStatus.received,
      placedAt: new Date('2024-01-01'),
      expectedArrival: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-14'),
      totalAmount: 10000,
      items: [
        { qtyOrdered: 100, qtyReceived: 100 },
        { qtyOrdered: 50, qtyReceived: 50 },
      ],
    };

    it('should generate PO performance report with default pagination', async () => {
      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([mockPO]);
      (prisma.purchaseOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([
        { status: PoStatus.received, _count: 1 },
      ]);
      (prisma.purchaseOrder.aggregate as jest.Mock).mockResolvedValue({
        _avg: { totalAmount: 10000 },
      });

      const result = await service.getPOPerformance({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'po-1',
        poNo: 'PO-2024-001',
        status: PoStatus.received,
        orderedQty: 150,
        receivedQty: 150,
        fulfillmentRate: 100,
        itemsCount: 2,
      });
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter POs by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([mockPO]);
      (prisma.purchaseOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      await service.getPOPerformance({ startDate, endDate });

      const whereClause = (prisma.purchaseOrder.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause.placedAt).toEqual({
        gte: startDate,
        lte: endDate,
      });
    });

    it('should filter POs by supplier', async () => {
      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([mockPO]);
      (prisma.purchaseOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      await service.getPOPerformance({ supplierId: 'supplier-1' });

      const whereClause = (prisma.purchaseOrder.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause.supplierId).toBe('supplier-1');
    });

    it('should filter POs by status', async () => {
      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([mockPO]);
      (prisma.purchaseOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      await service.getPOPerformance({ status: PoStatus.received });

      const whereClause = (prisma.purchaseOrder.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause.status).toBe(PoStatus.received);
    });

    it('should handle custom pagination', async () => {
      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([mockPO]);
      (prisma.purchaseOrder.count as jest.Mock).mockResolvedValue(50);
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getPOPerformance({ page: 2, limit: 10 });

      expect(result.pagination).toEqual({
        total: 50,
        page: 2,
        limit: 10,
        totalPages: 5,
      });
      const findManyCall = (prisma.purchaseOrder.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.skip).toBe(10); // (page 2 - 1) * limit 10
      expect(findManyCall.take).toBe(10);
    });

    it('should limit maximum page size to 100', async () => {
      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.count as jest.Mock).mockResolvedValue(0);
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      await service.getPOPerformance({ limit: 500 });

      const findManyCall = (prisma.purchaseOrder.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.take).toBe(100);
    });

    it('should calculate fulfillment rate correctly', async () => {
      const partialPO = {
        ...mockPO,
        status: PoStatus.partial,
        items: [
          { qtyOrdered: 100, qtyReceived: 50 },
          { qtyOrdered: 100, qtyReceived: 30 },
        ],
      };

      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([partialPO]);
      (prisma.purchaseOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getPOPerformance({});

      expect(result.data[0].orderedQty).toBe(200);
      expect(result.data[0].receivedQty).toBe(80);
      expect(result.data[0].fulfillmentRate).toBe(40); // (80/200)*100 = 40%
    });

    it('should calculate lead time for received POs', async () => {
      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([mockPO]);
      (prisma.purchaseOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getPOPerformance({});

      // Lead time: 2024-01-14 - 2024-01-01 = 13 days
      expect(result.data[0].leadTimeDays).toBe(13);
    });

    it('should handle POs with no items', async () => {
      const poWithoutItems = {
        ...mockPO,
        items: [],
      };

      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([poWithoutItems]);
      (prisma.purchaseOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getPOPerformance({});

      expect(result.data[0].orderedQty).toBe(0);
      expect(result.data[0].receivedQty).toBe(0);
      expect(result.data[0].fulfillmentRate).toBe(0);
      expect(result.data[0].itemsCount).toBe(0);
    });

    it('should handle empty result set', async () => {
      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.count as jest.Mock).mockResolvedValue(0);
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getPOPerformance({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getSupplierPerformance', () => {
    const mockSupplier = {
      id: 'supplier-1',
      code: 'SUP-001',
      name: 'Test Supplier',
      contactInfo: {},
      purchaseOrders: [
        {
          id: 'po-1',
          supplierId: 'supplier-1',
          status: PoStatus.received,
          placedAt: new Date('2024-01-01'),
          expectedArrival: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-14'),
          totalAmount: 10000,
          items: [
            { qtyOrdered: 100, qtyReceived: 100 },
            { qtyOrdered: 50, qtyReceived: 50 },
          ],
        },
      ],
    };

    it('should generate supplier performance report with default pagination', async () => {
      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([mockSupplier]);
      (prisma.supplier.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getSupplierPerformance({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'supplier-1',
        name: 'Test Supplier',
        totalOrders: 1,
        totalValue: 10000,
        fulfillmentRate: 100,
      });
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter suppliers by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([mockSupplier]);
      (prisma.supplier.count as jest.Mock).mockResolvedValue(1);

      await service.getSupplierPerformance({ startDate, endDate });

      const findManyCall = (prisma.supplier.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.include.purchaseOrders.where.placedAt).toBeDefined();
    });

    it('should handle custom pagination for supplier performance', async () => {
      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supplier.count as jest.Mock).mockResolvedValue(50);

      const result = await service.getSupplierPerformance({ page: 3, limit: 15 });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(15);
    });

    it('should limit supplier performance page size to 100', async () => {
      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supplier.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getSupplierPerformance({ limit: 500 });

      expect(result.pagination.limit).toBe(100);
    });

    it('should handle empty supplier list', async () => {
      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supplier.count as jest.Mock).mockResolvedValue(0);
      (prisma.supplier.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.supplier.aggregate as jest.Mock).mockResolvedValue({ _count: { id: 0 } });
      (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSupplierPerformance({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });
});
