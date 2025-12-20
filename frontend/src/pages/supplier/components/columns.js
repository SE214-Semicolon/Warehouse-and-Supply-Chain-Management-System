export const columns = [
  { id: 'stt', label: 'STT' },
  { id: 'code', label: 'Mã NCC' },
  { id: 'name', label: 'Tên NCC' },
  {
    id: 'contactInfo.phone',
    label: 'Số điện thoại',
    render: (_value, row) => row.contactInfo?.phone || '—',
  },
  {
    id: 'contactInfo.email',
    label: 'Email',
    render: (_value, row) => row.contactInfo?.email || '—',
  },
  {
    id: 'contactInfo.contactPerson',
    label: 'Người liên hệ',
    render: (_value, row) => row.contactInfo?.contactPerson || '—',
  },
  { id: 'address', label: 'Địa chỉ' },
  {
    id: 'createdAt',
    label: 'Ngày tạo',
    render: (value) =>
      value ? new Date(value).toLocaleDateString('vi-VN') : '—',
  },
];
