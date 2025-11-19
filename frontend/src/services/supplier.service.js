import api from '../utils/axiosInstance';

const API_URI = '/suppliers';

const SupplierService = {
  createSupplier: async (data) => {
    try {
      const response = await api.post(API_URI, data);
      return response.data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error.response?.data || error.message;
    }
  },

  getSuppliers: async (page = 1, pageSize = 10, sort = 'createdAt:desc') => {
    try {
      const response = await api.get(API_URI, {
        params: {
          page,
          pageSize,
          sort,
        },
      });
      return response;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error.response?.data || error.message;
    }
  },

  getSupplierById: async (id) => {
    try {
      const response = await api.get(`${API_URI}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching supplier by ID:', error);
      throw error.response?.data || error.message;
    }
  },

  updateSupplier: async (id, data) => {
    try {
      const response = await api.put(`${API_URI}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error.response?.data || error.message;
    }
  },

  deleteSupplier: async (id) => {
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
