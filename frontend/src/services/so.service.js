import api from '../utils/axiosInstance';
import { handleError } from '../utils/handleError';

const API_URI = '/sales-orders';

const SOService = {
  create: async (data) => {
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

  getAll: async (customerId, sort = 'createdAt:desc') => {
    try {
      const response = await api.get(API_URI, {
        params: {
          sort,
          customerId,
        },
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      handleError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${API_URI}/${id}`);
      console.log(response);
      return response.data;
    } catch (error) {
      console.error('Error fetching sales order by ID:', error);
      handleError(error);
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.patch(`${API_URI}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating sales order:', error);
      handleError(error);
    }
  },

  fulfill: async (id, data) => {
    try {
      const response = await api.post(`${API_URI}/${id}/fulfill`, data);
      return response.data;
    } catch (error) {
      console.error('Error fulfilling sales order:', error);
      handleError(error);
    }
  },

  cancel: async (id) => {
    try {
      const response = await api.post(`${API_URI}/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error canceling sales order:', error);
      handleError(error);
    }
  },
};
export default SOService;
