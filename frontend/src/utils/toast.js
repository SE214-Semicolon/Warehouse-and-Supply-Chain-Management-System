import { toast } from 'react-toastify';

const baseConfig = {
  position: 'top-right',
  autoClose: 3000,
};

export const showToast = {
  success: (msg) => toast.success(msg, baseConfig),

  error: (msg) => toast.error(msg, baseConfig),

  warning: (msg) => toast.warning(msg, baseConfig),

  info: (msg) => toast.info(msg, baseConfig),
};
