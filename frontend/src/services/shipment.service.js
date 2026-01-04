import api from "@/utils/axiosInstance";
import { handleError } from "@/utils/handleError";

const BASE = "/shipments";

const ShipmentService = {
  getAll: async () => {
    try {
      const response = await api.get(BASE);
      return response.data?.data || response.data || [];
    } catch (err) {
      handleError(err);
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${BASE}/${id}`);
      return response.data;
    } catch (err) {
      handleError(err);
    }
  },

  trackByCode: async (trackingCode) => {
    try {
      const response = await api.get(`${BASE}/track/${trackingCode}`);
      return response.data;
    } catch (err) {
      handleError(err);
    }
  },

  create: async (data) => {
    try {
      const response = await api.post(BASE, data);
      return response.data;
    } catch (err) {
      handleError(err);
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.patch(`${BASE}/${id}`, data);
      return response.data;
    } catch (err) {
      handleError(err);
    }
  },

  updateStatus: async (id, statusData) => {
    try {
      const response = await api.patch(`${BASE}/${id}/status`, statusData);
      return response.data;
    } catch (err) {
      handleError(err);
    }
  },

  addTrackingEvent: async (id, eventData) => {
    try {
      const response = await api.post(`${BASE}/${id}/tracking-events`, eventData);
      return response.data;
    } catch (err) {
      handleError(err);
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${BASE}/${id}`);
      return response.data;
    } catch (err) {
      handleError(err);
    }
  },
};

export default ShipmentService;
