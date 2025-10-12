import api from './api';

const API_URL = import.meta.env.VITE_BASE_URL + '/api/auth';

const AuthService = {
  signUp: async (data) => {
    try {
      const response = await api.post(`${API_URL}/signup`, data);
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error during sign up:', error);
      throw error.response?.data || error.message;
    }
  },

  login: async (data) => {
    try {
      const response = await api.post(`${API_URL}/login`, data);
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error during login:', error);
      throw error.response?.data || error.message;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  },

  getAccessToken: () => localStorage.getItem('accessToken'),
};

export default AuthService;
