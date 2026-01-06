import { formatDate } from '../../../../utils/formatDate';

export const columns = [
  { id: 'stt', label: 'No' },
  { id: 'code', label: 'Code', align: 'left' },
  { id: 'name', label: 'Name', align: 'left' },
  {
    id: 'contactInfo.phone',
    label: 'Phone',
    render: (value) => value || '',
  },
  {
    id: 'contactInfo.email',
    label: 'Email',
    render: (value) => value || '',
    align: 'left',
  },
  { id: 'address', label: 'Addess', align: 'left' },
  {
    id: 'createdAt',
    label: 'Created at',
    render: (value) => (value ? formatDate(value) : '—'),
  },
];
