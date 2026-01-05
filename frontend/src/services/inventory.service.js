import api from "@/utils/axiosInstance";
import { handleError } from "@/utils/handleError";

const BASE = "/inventory";

const InventoryService = {
  getByBatch: async (productBatchId) => {
    try {
      const res = await api.get(`${BASE}/product-batch`, {
        params: { productBatchId },
      });
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  getByLocation: async (locationId) => {
    try {
      const res = await api.get(`${BASE}/location`, {
        params: { locationId },
      });
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  receive: async (data) => {
    try {
      const res = await api.post(`${BASE}/receive`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  dispatch: async (data) => {
    try {
      const res = await api.post(`${BASE}/dispatch`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  adjust: async (data) => {
    try {
      const res = await api.post(`${BASE}/adjust`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  transfer: async (data) => {
    try {
      const res = await api.post(`${BASE}/transfer`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  reserve: async (data) => {
    try {
      const res = await api.post(`${BASE}/reserve`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  release: async (data) => {
    try {
      const res = await api.post(`${BASE}/release`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  updateQuantity: async (productBatchId, locationId, quantity) => {
    try {
      const res = await api.post(
        `${BASE}/${productBatchId}/${locationId}/update-quantity`,
        { quantity }
      );
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  softDelete: async (productBatchId, locationId) => {
    try {
      const res = await api.delete(`${BASE}/${productBatchId}/${locationId}`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  getMovementByBatch: async (productBatchId) => {
    try {
      const res = await api.get(`${BASE}/movements/product-batch`, {
        params: { productBatchId },
      });
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
};

export default InventoryService;
