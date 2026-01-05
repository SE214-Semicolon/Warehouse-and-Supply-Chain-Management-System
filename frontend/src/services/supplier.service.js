import api from '../utils/axiosInstance';

const API_URI = '/suppliers';

const SupplierService = {
  create: async (data) => {
    try {
      const response = await api.post(API_URI, data);
      return response.data;
    } catch (error) {
      console.error('Error creating supplier:', error);
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
      console.error('Error fetching suppliers:', error);
      throw error.response?.data || error.message;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${API_URI}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching supplier by ID:', error);
      throw error.response?.data || error.message;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.patch(`${API_URI}/${id}`, data);
      console.log(response.data);
      return response;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error.response?.data || error.message;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${API_URI}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error.response?.data || error.message;
    }
  },
};

export default SupplierService;
