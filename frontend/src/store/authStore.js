import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: (data) =>
        set({
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        }),

      updateTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export default useAuthStore;
