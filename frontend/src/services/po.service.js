import api from '../utils/axiosInstance';

const API_URI = '/purchase-orders';

const POService = {
  createDraft: async (data) => {
    try {
      const response = await api.post(API_URI, data);
      console.log(response);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  submitOrder: async (id) => {
    try {
      const response = await api.post(`${API_URI}/${id}/submit`);
      console.log(response);
      return response.data;
    } catch (error) {
      console.log(error);
      throw error.response?.data || error.message;
    }
  },

  getAll: async (page = 1, pageSize = 10, sort = 'createdAt:desc') => {
    try {
      const response = await api.get(API_URI, {
        params: {
          page,
          pageSize,
          sort,
        },
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching pos:', error);
      throw error.response?.data || error.message;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${API_URI}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching po by ID:', error);
      throw error.response?.data || error.message;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.patch(`${API_URI}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating po:', error);
      throw error.response?.data || error.message;
    }
  },

  receive: async (id, data) => {
    try {
      const response = await api.patch(`${API_URI}/${id}/receive`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating po:', error);
      throw error.response?.data || error.message;
    }
  },

  cancel: async (id, data) => {
    try {
      const response = await api.patch(`${API_URI}/${id}/cancel`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating po:', error);
      throw error.response?.data || error.message;
    }
  },
};

export default POService;
