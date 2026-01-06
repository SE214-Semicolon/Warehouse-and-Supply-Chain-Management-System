import axios from 'axios';
import useAuthStore from '../store/authStore';

const API_URL = import.meta.env.VITE_BASE_URL + '/auth';

const AuthService = {
  // email, password, fullName? => {accessToken, refreshToken}
  signUp: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/signup`, data);
      const { accessToken, refreshToken } = response.data;
      useAuthStore.getState().login({
        accessToken,
        refreshToken,
      });
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error during sign up:', error);
      throw error.response?.data || error.message;
    }
  },

  // email, password => {accessToken, refreshToken}
  login: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/login`, data);
      const { accessToken, refreshToken } = response.data;
      useAuthStore.getState().login({
        accessToken,
        refreshToken,
      });
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error during login:', error);
      throw error.response?.data || error.message;
    }
  },

  logout: async () => {
    const { refreshToken } = useAuthStore.getState();
    try {
      await axios.post(`${API_URL}/logout`, { refreshToken });
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      useAuthStore.getState().logout();
      localStorage.clear();
      window.location.href = '/login';
    }
  },

  getAccessToken: () => localStorage.getItem('accessToken'),

  // refreshToken => {accessToken, refreshToken}
  refreshToken: async (refresh_token) => {
    try {
      const response = await axios.post(`${API_URL}/refresh`, {
        refreshToken: refresh_token,
      });
      return response.data;
    } catch (error) {
      console.error('Refresh token failed:', error);
      throw error;
    }
  },
};

export default AuthService;
