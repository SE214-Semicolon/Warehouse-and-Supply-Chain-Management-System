export const columns = [
  { id: 'stt', label: 'No' },
  { id: 'code', label: 'Code' },
  { id: 'name', label: 'Name' },
  {
    id: 'contactInfo.phone',
    label: 'Phone',
    render: (value) => value || '—',
  },
  {
    id: 'contactInfo.email',
    label: 'Email',
    render: (value) => value || '—',
  },
  { id: 'address', label: 'Addess' },
  {
    id: 'createdAt',
    label: 'Created at',
    render: (value) =>
      value ? new Date(value).toLocaleDateString('vi-VN') : '—',
  },
];
