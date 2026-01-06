import api from '@/utils/axiosInstance';

export const AuditService = {
  getLogs: (params) => {
    const cleanedParams = Object.fromEntries(
      Object.entries(params).filter(([_a, v]) => v !== '' && v !== null)
    );
    return api.get('/audit-logs', { params: cleanedParams });
  },
};
