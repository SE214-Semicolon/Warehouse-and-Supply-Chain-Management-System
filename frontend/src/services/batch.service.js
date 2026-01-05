import api from "@/utils/axiosInstance";
import { handleError } from "@/utils/handleError";

const BASE = "/product-batches";

const ProductBatchService = {
  getAll: () => api.get(BASE),

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
      const response = await api.patch(`${BASE}/${id}`, data);
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

export default ProductBatchService;
