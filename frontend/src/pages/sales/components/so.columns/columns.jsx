import { formatDate } from '../../../../utils/formatDate';

export const columns = [
  { id: 'stt', label: 'No' },
  { id: 'soNo', label: 'SO Code', search: true },
  {
    id: 'customer.name',
    label: 'Customer',
    render: (value) => value || '',
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
    id: 'status',
    label: 'Status',
    render: (value) => {
      const color =
        {
          pending: 'gray',
          approved: 'blue',
          processing: 'orange',
          shipped: 'green',
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
