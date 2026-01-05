import api from '../utils/axiosInstance';
import { handleError } from '../utils/handleError';

const API_URI = '/suppliers';

const SupplierService = {
  create: async (data) => {
    try {
      const response = await api.post(API_URI, data);
      return response.data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      handleError(error);
    }
  },

  getAll: async (sort = 'createdAt:desc') => {
    try {
      const response = await api.get(API_URI, {
        params: {
          sort,
        },
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      handleError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${API_URI}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching supplier by ID:', error);
      handleError(error);
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.patch(`${API_URI}/${id}`, data);
      console.log(response.data);
      return response;
    } catch (error) {
      console.error('Error updating supplier:', error);
      handleError(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${API_URI}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      handleError(error);
    }
  },
};

export default SupplierService;
