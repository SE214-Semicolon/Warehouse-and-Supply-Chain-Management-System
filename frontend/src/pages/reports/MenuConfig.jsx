import LowStockReport from './tabs/low-stock';
import ExpiryReport from './tabs/expiry';
import StockLevelReport from './tabs/stock-level';
import MovementReport from './tabs/movement';
import ValuationReport from './tabs/valuation';
import ProductPerformanceReport from './tabs/product-performance';
import WarehouseUtilizationReport from './tabs/warehouse-utilization';
import DemandAccuracyReport from './tabs/demand-accuracy';

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
];
