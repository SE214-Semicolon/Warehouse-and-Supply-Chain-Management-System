import api from "../utils/axiosInstance";

const BASE = "/product-categories";

const ProductCategories = {
  getAllCategories: () => api.get(BASE),

  createCategories: async (data) => {
    try {
      const response = await api.post("/product-categories", data);
      return response.data;
    } catch (err) {
      console.log(err);
    }
  },
};

export default ProductCategories;
