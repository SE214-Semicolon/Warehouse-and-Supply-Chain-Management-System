import { Test, TestingModule } from '@nestjs/testing';
import { SalesReportingService } from '../../services/sales-reporting.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

describe('SalesReportingService', () => {
  let service: SalesReportingService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    salesOrder: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    salesOrderItem: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    productCategory: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesReportingService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SalesReportingService>(SalesReportingService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSOPerformance', () => {
    const mockCustomer = {
      id: 'customer-1',
      name: 'Test Customer',
    };

    const mockSO = {
      id: 'so-1',
      soNo: 'SO-2024-001',
      customerId: 'customer-1',
      customer: mockCustomer,
      status: OrderStatus.closed,
      createdAt: new Date('2024-01-01'),
      placedAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-15'),
      totalAmount: 5000,
      items: [
        {
          qty: 10,
          qtyFulfilled: 10,
          product: { sku: 'PROD-001', name: 'Product 1' },
        },
        {
          qty: 5,
          qtyFulfilled: 5,
          product: { sku: 'PROD-002', name: 'Product 2' },
        },
      ],
    };

    it('should generate SO performance report with default pagination', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSO]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([
        { status: OrderStatus.closed, _count: 1 },
      ]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({
        _avg: { totalAmount: 5000 },
      });

      const result = await service.getSOPerformance({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'so-1',
        soNo: 'SO-2024-001',
        status: OrderStatus.closed,
        orderedQty: 15,
        fulfilledQty: 15,
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

    it('should filter SOs by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSO]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      await service.getSOPerformance({ startDate, endDate });

      const whereClause = (prisma.salesOrder.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause.createdAt).toEqual({
        gte: startDate,
        lte: endDate,
      });
    });

    it('should filter SOs by customer', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSO]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      await service.getSOPerformance({ customerId: 'customer-1' });

      const whereClause = (prisma.salesOrder.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause.customerId).toBe('customer-1');
    });

    it('should filter SOs by status', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSO]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      await service.getSOPerformance({ status: OrderStatus.closed });

      const whereClause = (prisma.salesOrder.findMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause.status).toBe(OrderStatus.closed);
    });

    it('should handle custom pagination', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSO]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(75);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getSOPerformance({ page: 3, limit: 15 });

      expect(result.pagination).toEqual({
        total: 75,
        page: 3,
        limit: 15,
        totalPages: 5,
      });
      const findManyCall = (prisma.salesOrder.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.skip).toBe(30); // (page 3 - 1) * limit 15
      expect(findManyCall.take).toBe(15);
    });

    it('should limit maximum page size to 100', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(0);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      await service.getSOPerformance({ limit: 200 });

      const findManyCall = (prisma.salesOrder.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.take).toBe(100);
    });

    it('should calculate fulfillment rate correctly for partial fulfillment', async () => {
      const partialSO = {
        ...mockSO,
        status: OrderStatus.pending,
        items: [
          { qty: 100, qtyFulfilled: 60, product: { sku: 'A', name: 'A' } },
          { qty: 100, qtyFulfilled: 40, product: { sku: 'B', name: 'B' } },
        ],
      };

      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([partialSO]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getSOPerformance({});

      expect(result.data[0].orderedQty).toBe(200);
      expect(result.data[0].fulfilledQty).toBe(100);
      expect(result.data[0].fulfillmentRate).toBe(50); // (100/200)*100 = 50%
    });

    it('should calculate fulfillment time for closed orders', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSO]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getSOPerformance({});

      // Fulfillment time: 2024-01-15 - 2024-01-02 = 13 days
      expect(result.data[0].fulfillmentTimeDays).toBe(13);
    });

    it('should handle SOs with no items', async () => {
      const soWithoutItems = {
        ...mockSO,
        items: [],
      };

      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([soWithoutItems]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getSOPerformance({});

      expect(result.data[0].orderedQty).toBe(0);
      expect(result.data[0].fulfilledQty).toBe(0);
      expect(result.data[0].fulfillmentRate).toBe(0);
      expect(result.data[0].itemsCount).toBe(0);
    });

    it('should handle empty result set', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(0);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getSOPerformance({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should convert totalAmount to number', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSO]);
      (prisma.salesOrder.count as jest.Mock).mockResolvedValue(1);
      (prisma.salesOrder.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrder.aggregate as jest.Mock).mockResolvedValue({ _avg: {} });

      const result = await service.getSOPerformance({});

      expect(typeof result.data[0].totalAmount).toBe('number');
      expect(result.data[0].totalAmount).toBe(5000);
    });
  });

  describe('getSalesTrends', () => {
    const mockSOWithItems = {
      id: 'so-1',
      soNo: 'SO-001',
      placedAt: new Date('2024-01-15'),
      submittedAt: new Date('2024-01-15'),
      totalAmount: 10000,
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          qty: 100,
          lineTotal: 10000,
          product: {
            id: 'prod-1',
            sku: 'SKU-001',
            name: 'Product 1',
            categoryId: 'cat-1',
          },
        },
      ],
    };

    it('should generate daily sales trends', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSOWithItems]);
      (prisma.salesOrderItem.findMany as jest.Mock).mockResolvedValue([
        {
          productId: 'prod-1',
          qty: 100,
          unitPrice: 100,
          product: {
            id: 'prod-1',
            sku: 'SKU-001',
            name: 'Product 1',
            categoryId: 'cat-1',
          },
        },
      ]);

      const result = await service.getSalesTrends({ groupBy: 'day' });

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
    });

    it('should filter trends by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSOWithItems]);
      (prisma.salesOrderItem.findMany as jest.Mock).mockResolvedValue([]);

      await service.getSalesTrends({ startDate, endDate, groupBy: 'month' });

      const findManyCall = (prisma.salesOrder.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.placedAt).toBeDefined();
    });

    it('should filter trends by product', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSOWithItems]);
      (prisma.salesOrderItem.findMany as jest.Mock).mockResolvedValue([]);

      await service.getSalesTrends({ productId: 'prod-1', groupBy: 'week' });

      expect(prisma.salesOrder.findMany).toHaveBeenCalled();
    });

    it('should filter trends by category', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([mockSOWithItems]);
      (prisma.salesOrderItem.findMany as jest.Mock).mockResolvedValue([]);

      await service.getSalesTrends({ categoryId: 'cat-1', groupBy: 'week' });

      expect(prisma.salesOrder.findMany).toHaveBeenCalled();
    });

    it('should handle empty trends data', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrderItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSalesTrends({ groupBy: 'day' });

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
    });

    it('should use default groupBy as day', async () => {
      (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.salesOrderItem.findMany as jest.Mock).mockResolvedValue([]);

      await service.getSalesTrends({});

      expect(prisma.salesOrder.findMany).toHaveBeenCalled();
    });
  });
});
