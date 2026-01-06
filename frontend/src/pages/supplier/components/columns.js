import { formatDate } from '../../../utils/formatDate';

export const columns = [
  { id: 'stt', label: 'No' },
  { id: 'code', label: 'Code', search: true, align: 'left' },
  { id: 'name', label: 'Name', search: true, align: 'left' },
  {
    id: 'contactInfo.phone',
    label: 'Phone',
    render: (value) => (value ? value : ''),
    search: true,
    align: 'left',
  },
  {
    id: 'contactInfo.email',
    label: 'Email',
    render: (value) => (value ? value : ''),
    search: true,
    align: 'left',
  },
  {
    id: 'contactInfo.contactPerson',
    label: 'Contact person',
    render: (value) => (value ? value : ''),
    search: true,
    align: 'left',
  },
  { id: 'address', label: 'Addess', search: true, align: 'left' },
  {
    id: 'createdAt',
    label: 'Created at',
    render: (value) => (value ? formatDate(value) : ''),
    align: 'left',
  },
];
