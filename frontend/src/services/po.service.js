import api from '../utils/axiosInstance';
import { handleError } from '../utils/handleError';

const API_URI = '/purchase-orders';

const POService = {
  createDraft: async (data) => {
    try {
      const response = await api.post(API_URI, data);
      console.log(response);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  submitOrder: async (id) => {
    try {
      const response = await api.post(`${API_URI}/${id}/submit`);
      console.log(response);
      return response.data;
    } catch (error) {
      console.log(error);
      handleError(error);
    }
  },

  getAll: async (supplierId, sort = 'createdAt:desc') => {
    try {
      const response = await api.get(API_URI, {
        params: {
          sort,
          supplierId,
        },
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching pos:', error);
      handleError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${API_URI}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching po by ID:', error);
      handleError(error);
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.patch(`${API_URI}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating po:', error);
      handleError(error);
    }
  },

  receive: async (id, data) => {
    try {
      const response = await api.post(`${API_URI}/${id}/receive`, data);
      return response.data;
    } catch (error) {
      console.error('Error receiving po:', error);
      handleError(error);
    }
  },

  cancel: async (id, data) => {
    try {
      const response = await api.post(`${API_URI}/${id}/cancel`, data);
      return response.data;
    } catch (error) {
      console.error('Error cancelling po:', error);
      handleError(error);
    }
  },
};

export default POService;
