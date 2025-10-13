import api from './api';

const API_URL = import.meta.env.VITE_BASE_URL + '/api/suppliers';

const SupplierService = {
  createSupplier: async (data) => {
    try {
      const response = await api.post(API_URL, data);
      return response.data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error.response?.data || error.message;
    }
  },

  getSuppliers: async () => {
    try {
      const response = await api.get(API_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error.response?.data || error.message;
    }
  },

  getSupplierById: async (id) => {
    try {
      const response = await api.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching supplier by ID:', error);
      throw error.response?.data || error.message;
    }
  },

  updateSupplier: async (id, data) => {
    try {
      const response = await api.put(`${API_URL}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error.response?.data || error.message;
    }
  },

  deleteSupplier: async (id) => {
    try {
      const response = await api.delete(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error.response?.data || error.message;
    }
  },
};

export default SupplierService;
