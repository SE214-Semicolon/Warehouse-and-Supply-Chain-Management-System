import api from '../utils/axiosInstance';
import { handleError } from '../utils/handleError';

const API_URI = '/reports';

const InventoryReportService = {
  getLowStock: async () => {
    try {
      const response = await api.get(API_URI + '/inventory/low-stock');
      return response;
    } catch (error) {
      console.error('Err low stock:', error);
      handleError(error);
    }
  },

  getExpiry: async () => {
    try {
      const response = await api.get(API_URI + '/inventory/expiry');
      return response;
    } catch (error) {
      console.error('Err expiry:', error);
      handleError(error);
    }
  },

  getStockLevel: async ({ page = 1, limit = 20 } = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);

      const response = await api.get(
        `${API_URI}/inventory/stock-levels?${params.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Err stock level:', error);
      handleError(error);
    }
  },

  getMovement: async ({ startDate, endDate, page = 1, limit = 20 } = {}) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page);
      params.append('limit', limit);

      const response = await api.get(
        `${API_URI}/inventory/movements?${params.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Err movement:', error);
      handleError(error);
    }
  },

  getValuation: async () => {
    try {
      const response = await api.get(API_URI + '/inventory/valuation');
      return response;
    } catch (error) {
      console.error('Err valuation:', error);
      handleError(error);
    }
  },
};

const ProductReportService = {
  getPerformance: async () => {
    try {
      const response = await api.get(API_URI + '/product/performance');
      return response;
    } catch (error) {
      console.error('Err product performance:', error);
      handleError(error);
    }
  },
};

const WarehouseReportService = {
  getUtilization: async () => {
    try {
      const response = await api.get(API_URI + '/warehouse/utilization');
      return response;
    } catch (error) {
      console.error('Err warehouse utilization:', error);
      handleError(error);
    }
  },
};

const DemandPlanReportService = {
  getAccuracy: async () => {
    try {
      const response = await api.get(API_URI + '/demand-planning/accuracy');
      return response;
    } catch (error) {
      console.error('Err demand plan accuracy:', error);
      handleError(error);
    }
  },
};

const ProcurementReportService = {
  getPOPerformance: async () => {
    try {
      const response = await api.get(API_URI + '/procurement/po-performance');
      return response;
    } catch (error) {
      console.error('Err po performance:', error);
      handleError(error);
    }
  },

  getSupplierPerformance: async () => {
    try {
      const response = await api.get(
        API_URI + '/procurement/supplier-performance'
      );
      return response;
    } catch (error) {
      console.error('Err supplier performance:', error);
      handleError(error);
    }
  },
};

const SalesReportService = {
  getSOPerformance: async () => {
    try {
      const response = await api.get(API_URI + '/sales/so-performance');
      return response;
    } catch (error) {
      console.error('Err so performance:', error);
      handleError(error);
    }
  },
  getSalesTrend: async () => {
    try {
      const response = await api.get(API_URI + '/sales/sales-trend');
      return response;
    } catch (error) {
      console.error('Err sales trend:', error);
      handleError(error);
    }
  },
};

export {
  InventoryReportService,
  ProductReportService,
  WarehouseReportService,
  DemandPlanReportService,
  ProcurementReportService,
  SalesReportService,
};
