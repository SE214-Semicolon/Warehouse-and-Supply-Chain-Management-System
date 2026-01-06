import { Chip, Typography, Box } from '@mui/material';
import { PlusCircle, Edit, Trash2, Clock } from 'lucide-react';
import { formatDateTime } from '../../utils/formatDate';

export const getActionStyle = (action) => {
  switch (action) {
    case 'CREATE':
      return { color: 'success', icon: <PlusCircle size={14} /> };
    case 'UPDATE':
      return { color: 'info', icon: <Edit size={14} /> };
    case 'DELETE':
      return { color: 'error', icon: <Trash2 size={14} /> };
    default:
      return { color: 'default', icon: null };
  }
};

export const columns = [
  {
    id: 'timestamp',
    label: 'Timestamp',
    render: (row) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Clock size={14} color="#64748b" />
        {formatDateTime(row.timestamp)}
      </Box>
    ),
  },
  {
    id: 'entity',
    label: 'Entity',
    render: (row) => (
      <Box>
        <Typography variant="body2" fontWeight={600}>
          {row.entityType}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.entityId}
        </Typography>
      </Box>
    ),
  },
  {
    id: 'action',
    label: 'Action',
    render: (row) => {
      const style = getActionStyle(row.action);
      return (
        <Chip
          label={row.action}
          size="small"
          color={style.color}
          icon={style.icon}
          sx={{ fontWeight: 600, borderRadius: 1.5 }}
        />
      );
    },
  },
  {
    id: 'userEmail',
    label: 'User',
    render: (row) => row.userEmail || 'System',
  },
  {
    id: 'path',
    label: 'Path',
    render: (row) => (
      <Typography
        variant="caption"
        sx={{
          bgcolor: '#f1f5f9',
          p: 0.5,
          borderRadius: 1,
        }}
      >
        {row.method} {row.path}
      </Typography>
    ),
  },
];
