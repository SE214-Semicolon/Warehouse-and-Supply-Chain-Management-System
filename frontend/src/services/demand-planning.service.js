import api from "@/utils/axiosInstance";
import { handleError } from "@/utils/handleError";

const BASE = "/demand-planning/forecasts";

const DemandPlanningService = {
  getAll: async () => {
    try {
      const response = await api.get(BASE);
      return response.data;
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
      const response = await api.put(`${BASE}/${id}`, data);
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

  runAlgorithm: async (productId, payload) => {
    try {
      const response = await api.post(`${BASE}/run/${productId}`, payload);
      return response.data;
    } catch (err) {
      handleError(err);
    }
  },
};

export default DemandPlanningService;
