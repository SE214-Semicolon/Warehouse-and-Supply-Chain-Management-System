import api from "./api";

const ProductCategories = {
  getAllCategories: () => api.get("/product-categories"),

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
