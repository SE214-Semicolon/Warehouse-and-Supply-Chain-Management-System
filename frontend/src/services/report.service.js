import api from '../utils/axiosInstance';

const API_URI = '/reports';

const InventoryReportService = {
  getLowStock: async () => {
    try {
      const response = await api.get(API_URI + '/inventory/low-stock');
      return response;
    } catch (error) {
      console.error('Err low stock:', error);
      throw error.response?.data || error.message;
    }
  },

  getExpiry: async () => {
    try {
      const response = await api.get(API_URI + '/inventory/expiry');
      return response;
    } catch (error) {
      console.error('Err expiry:', error);
      throw error.response?.data || error.message;
    }
  },

  getStockLevel: async () => {
    try {
      const response = await api.get(API_URI + '/inventory/stock-levels');
      return response;
    } catch (error) {
      console.error('Err stock level:', error);
      throw error.response?.data || error.message;
    }
  },

  getMovement: async () => {
    try {
      const response = await api.get(API_URI + '/inventory/movements');
      return response;
    } catch (error) {
      console.error('Err movement:', error);
      throw error.response?.data || error.message;
    }
  },

  getValuation: async () => {
    try {
      const response = await api.get(API_URI + '/inventory/valuation');
      return response;
    } catch (error) {
      console.error('Err valuation:', error);
      throw error.response?.data || error.message;
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
      throw error.response?.data || error.message;
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
      throw error.response?.data || error.message;
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
      throw error.response?.data || error.message;
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
      throw error.response?.data || error.message;
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
      throw error.response?.data || error.message;
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
      throw error.response?.data || error.message;
    }
  },
  getSalesTrend: async () => {
    try {
      const response = await api.get(API_URI + '/sales/sales-trend');
      return response;
    } catch (error) {
      console.error('Err sales trend:', error);
      throw error.response?.data || error.message;
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
