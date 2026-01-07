import { formatDate } from '../../../utils/formatDate';

export const columns = [
  { id: 'stt', label: 'No' },
  { id: 'poNo', label: 'PO Code', search: true },
  {
    id: 'supplier.name',
    label: 'Supplier',
    render: (value) => value || '—',
    search: true,
    align: 'left',
  },
  {
    id: 'totalAmount',
    label: 'Total',
    render: (value) => Number(value).toLocaleString(),
    align: 'right',
  },
  {
    id: 'placedAt',
    label: 'Order date',
    render: (value) => (value ? formatDate(value) : '—'),
  },
  {
    id: 'expectedArrival',
    label: 'Expected arrival',
    render: (value) => (value ? formatDate(value) : '—'),
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
