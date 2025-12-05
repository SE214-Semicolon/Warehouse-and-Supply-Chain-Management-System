import api from "../utils/axiosInstance";

const BASE = "/locations";

const Locations = {
  getAll: () => api.get(BASE),

  create: async (data) => {
    try {
      const response = await api.post(BASE, data);
      return response.data;
    } catch (err) {
      console.log(err);
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.patch(`${BASE}/${id}`, data);
      return response.data;
    } catch (err) {
      console.log(err);
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${BASE}/${id}`);
      return response.data;
    } catch (err) {
      console.log(err);
    }
  },
};

export default Locations;
