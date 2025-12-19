import api from "@/utils/axiosInstance";
import { handleError } from "@/utils/handleError";

const BASE = "/auth";

const UserService = {
  getCurrentUser: async () => {
    try {
      const res = await api.get(`${BASE}/me`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
};

export default UserService;
