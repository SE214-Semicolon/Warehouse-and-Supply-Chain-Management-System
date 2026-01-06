import api from '@/utils/axiosInstance';
import { handleError } from '@/utils/handleError';

const AUTH_BASE = '/auth';
const BASE = '/users';

const UserService = {
  getCurrentUser: async () => {
    try {
      const res = await api.get(`${AUTH_BASE}/me`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  getUsers: async (params) => {
    try {
      const res = await api.get(BASE, { params });
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  createUser: async (data) => {
    try {
      const res = await api.post(BASE, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  updateUser: async (id, data) => {
    try {
      const res = await api.patch(`${BASE}/${id}`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  deleteUser: async (id) => {
    try {
      const res = await api.delete(`${BASE}/${id}`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
};

export default UserService;
