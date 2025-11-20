export const mockPOData = {
  poNo: 'PO2025-0481',
  createdAt: '10/11/2025 14:32',
  placedAt: '10/11/2025 16:20',
  updatedAt: '16/11/2025 09:15',
  expectedArrival: '25/11/2025',
  status: 'Đang giao hàng',
  statusColor: 'warning',
  supplier: {
    name: 'Công ty TNHH ABC Việt Nam',
    code: 'NCC001',
  },
  products: [
    {
      code: 'SP-2024-118',
      name: 'Bộ nguồn công nghiệp 24V 10A',
      quantity: 50,
      unitPrice: '₫1.450.000',
      total: '₫72.500.000',
    },
    {
      code: 'SP-2024-225',
      name: 'Cảm biến nhiệt độ PT100',
      quantity: 200,
      unitPrice: '₫560.000',
      total: '₫112.000.000',
    },
  ],
  totalAmount: '₫184.500.000',
  statusHistory: [
    { date: '10/11 14:32', text: 'Tạo mới', color: 'text.primary' },
    { date: '10/11 16:20', text: 'Đã duyệt', color: 'primary.main' },
    { date: '15/11 10:15', text: 'Đang giao', color: '#f59e0b' },
  ],
};
