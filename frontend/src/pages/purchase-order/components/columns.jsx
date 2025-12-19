export const columns = [
  { id: 'stt', label: 'STT' },
  { id: 'poNo', label: 'Mã PO' },
  {
    id: 'supplier.name',
    label: 'Nhà cung cấp',
    render: (_value, row) => row.supplier?.name || '—',
  },
  { id: 'totalAmount', label: 'Tổng tiền' },
  {
    id: 'placedAt',
    label: 'Ngày đặt',
    render: (value) =>
      value ? new Date(value).toLocaleDateString('vi-VN') : '—',
  },
  {
    id: 'expectedArrival',
    label: 'Dự kiến nhận',
    render: (value) =>
      value ? new Date(value).toLocaleDateString('vi-VN') : '—',
  },
  {
    id: 'status',
    label: 'Trạng thái',
    render: (value) => {
      const color =
        {
          draft: 'gray',
          ordered: 'blue',
          partial: 'orange',
          received: 'green',
          cancelled: 'red',
        }[value] || 'gray';

      return (
        <span
          style={{
            padding: '4px 12px',
            borderRadius: 12,
            background: color,
            color: 'white',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
          }}
        >
          {value}
        </span>
      );
    },
  },
];
