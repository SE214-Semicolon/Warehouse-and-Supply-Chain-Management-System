import LowStockReport from './tabs/low-stock';
import ExpiryReport from './tabs/expiry';
import StockLevelReport from './tabs/stock-level';
import MovementReport from './tabs/movement';
import ValuationReport from './tabs/valuation';

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
];
