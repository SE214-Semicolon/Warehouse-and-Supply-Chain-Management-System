import LowStockReport from './tabs/low-stock';
import ExpiryReport from './tabs/expiry';
import StockLevelReport from './tabs/stock-level';
import MovementReport from './tabs/movement';
import ValuationReport from './tabs/valuation';
import ProductPerformanceReport from './tabs/product-performance';
import WarehouseUtilizationReport from './tabs/warehouse-utilization';
import DemandAccuracyReport from './tabs/demand-accuracy';
import SupplierPerformanceReport from './tabs/supplier-performance';
import POPerformanceReport from './tabs/po-performance';

export const menuItems = [
  {
    id: 'low-stock',
    label: 'Low Stock',
    ReportComponent: LowStockReport,
  },
  {
    id: 'expiry',
    label: 'Expiry',
    ReportComponent: ExpiryReport,
  },
  {
    id: 'stock-level',
    label: 'Stock Level',
    ReportComponent: StockLevelReport,
  },
  {
    id: 'movement',
    label: 'Movement',
    ReportComponent: MovementReport,
  },
  {
    id: 'valuation',
    label: 'Valuation',
    ReportComponent: ValuationReport,
  },
  {
    id: 'product-performance',
    label: 'Product Performance',
    ReportComponent: ProductPerformanceReport,
  },
  {
    id: 'warehouse-utilization',
    label: 'Warehouse Utilization',
    ReportComponent: WarehouseUtilizationReport,
  },
  {
    id: 'demand-accuracy',
    label: 'Demand Accuracy',
    ReportComponent: DemandAccuracyReport,
  },
  {
    id: 'supplier-performance',
    label: 'Supplier Performance',
    ReportComponent: SupplierPerformanceReport,
  },
  {
    id: 'po-performance',
    label: 'PO Performance',
    ReportComponent: POPerformanceReport,
  },
];
