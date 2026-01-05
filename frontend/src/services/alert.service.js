import api from "@/utils/axiosInstance";
import { handleError } from "@/utils/handleError";

const BASE = "/alerts";

const AlertService = {
  getAll: async () => {
    try {
      const response = await api.get(BASE);
      return response.data;
    } catch (err) {
      handleError(err);
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await api.get(`${BASE}/unread-count`);
      return response.data;
    } catch (err) {
      handleError(err);
    }
  },

  markAsRead: async (id) => {
    try {
      const response = await api.patch(`${BASE}/${id}/read`);
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

export default AlertService;
