const mockSupplierData = {
  id: '1',
  code: 'SUP001',
  name: 'Công ty TNHH ABC Việt Nam',
  address: '123 Đường Lê Lợi, Q.1, TP.HCM',
  phone: '028 3829 1234',
  email: 'contact@abc.com.vn',
  website: 'http://www.abc.com.vn',
  taxCode: '0312345678',
  category: 'Linh kiện điện tử, Vật tư công nghiệp',
  cooperationDate: '15/03/2020',
  performance: {
    rating: 4.6,
    totalReviews: 128,
    metrics: [
      { name: 'Giao hàng đúng hạn', percentage: 92, color: 'success' },
      { name: 'Chất lượng sản phẩm', percentage: 88, color: 'success' },
      { name: 'Hỗ trợ sau bán', percentage: 85, color: 'warning' },
      { name: 'Giá cả cạnh tranh', percentage: 79, color: 'error' },
    ],
  },
  stats: [
    { label: 'Tổng PO', value: 248, color: 'blue', unit: '' },
    { label: 'Tổng giá trị', value: '₫2.84 tỷ', color: 'green', unit: '' },
    { label: 'PO đang mở', value: 12, color: 'yellow', unit: '' },
    { label: 'Tỷ lệ hoàn thành', value: '98.2%', color: 'purple', unit: '' },
  ],
  recentOrders: [
    {
      id: 'PO2025-0481',
      date: '10/11/2025',
      value: '₫184.500.000',
      status: 'Đang giao',
      statusColor: 'warning',
    },
    {
      id: 'PO2025-0456',
      date: '28/10/2025',
      value: '₫92.300.000',
      status: 'Hoàn thành',
      statusColor: 'success',
    },
    {
      id: 'PO2025-0423',
      date: '15/10/2025',
      value: '₫256.800.000',
      status: 'Hoàn thành',
      statusColor: 'success',
    },
    {
      id: 'PO2025-0401',
      date: '01/10/2025',
      value: '₫55.000.000',
      status: 'Đã hủy',
      statusColor: 'error',
    },
  ],
};

export default mockSupplierData;
