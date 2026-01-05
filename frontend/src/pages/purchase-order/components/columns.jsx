export const columns = [
  { id: 'stt', label: 'No' },
  { id: 'poNo', label: 'PO Code' },
  {
    id: 'supplier.name',
    label: 'Supplier',
    render: (value) => value || '—',
  },
  { id: 'totalAmount', label: 'Total' },
  {
    id: 'placedAt',
    label: 'Order date',
    render: (value) =>
      value ? new Date(value).toLocaleDateString('vi-VN') : '—',
  },
  {
    id: 'expectedArrival',
    label: 'Expected arrival',
    render: (value) =>
      value ? new Date(value).toLocaleDateString('vi-VN') : '—',
  },
  {
    id: 'status',
    label: 'Status',
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
