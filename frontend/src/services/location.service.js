import api from "../utils/axiosInstance";

const BASE = "/locations";

const LocationService = {
  getAll: () => api.get(BASE),

  create: async (data) => {
    try {
      const response = await api.post(BASE, data);
      return response.data;
    } catch (err) {
      console.log(err?.response?.data);
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.patch(`${BASE}/${id}`, data);
      return response.data;
    } catch (err) {
      console.log(err?.response?.data);
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${BASE}/${id}`);
      return response.data;
    } catch (err) {
      console.log(err?.response?.data);
    }
  },
};

export default LocationService;
