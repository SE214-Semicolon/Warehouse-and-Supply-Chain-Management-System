import api from '@/utils/axiosInstance';

export const AuditService = {
  getLogs: (params) => {
    return api.get('/audit-logs', { params });
  },
};
