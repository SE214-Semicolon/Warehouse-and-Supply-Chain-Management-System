import { Box, Typography, Chip, Stack, Avatar } from '@mui/material';
import { ArrowRight, Package } from 'lucide-react';

const columns = [
  {
    id: 'time',
    label: 'Time',
    align: 'left',
    width: '12%',
    render: (m) => (
      <>
        <Typography variant="body2" fontWeight="600">
          {new Date(m.createdAt).toLocaleDateString('vi-VN')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(m.createdAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      </>
    ),
  },
  {
    id: 'product',
    label: 'Product / SKU',
    align: 'left',
    width: '25%',
    render: (m) => (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: 1.5 }}>
          <Package size={20} color="#64748b" />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight="700">
            {m.productBatch.product.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            SKU: {m.productBatch.product.sku}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <br />
            Batch: {m.productBatch.batchNo}
          </Typography>
        </Box>
      </Stack>
    ),
  },
  {
    id: 'type',
    label: 'Transaction Type',
    align: 'left',
    width: '13%',
    render: (_, config) => (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        variant="soft"
        sx={{ fontWeight: 700, borderRadius: 1.5, px: 0.5 }}
      />
    ),
  },
  {
    id: 'route',
    label: 'Route (From → To)',
    align: 'center',
    width: '18%',
    render: (m) => (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="center"
      >
        <Box sx={{ textAlign: 'right', minWidth: 80 }}>
          <Typography variant="body2" fontWeight="600">
            {m.fromLocation?.code || '---'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Source
          </Typography>
        </Box>
        <ArrowRight size={16} color="#94a3b8" />
        <Box sx={{ textAlign: 'left', minWidth: 80 }}>
          <Typography variant="body2" fontWeight="600" color="primary.main">
            {m.toLocation?.code || '---'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Destination
          </Typography>
        </Box>
      </Stack>
    ),
  },
  {
    id: 'quantity',
    label: 'Quantity',
    align: 'right',
    width: '10%',
    render: (m, config) => (
      <>
        <Typography variant="body1" fontWeight="800">
          {config.category === 'out' ? '-' : '+'}
          {m.quantity.toLocaleString()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {m.productBatch.product.unit}
        </Typography>
      </>
    ),
  },
  {
    id: 'user',
    label: 'Performed By',
    align: 'right',
    width: '15%',
    render: (m) => (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="flex-end"
      >
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" fontWeight="600">
            {m.createdBy?.fullName || m.createdBy?.email || 'System'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {m.createdBy?.role || 'Staff'}
          </Typography>
        </Box>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: '0.8rem',
            bgcolor: '#e2e8f0',
            color: '#475569',
          }}
        >
          {(m.createdBy?.fullName || 'S').charAt(0).toUpperCase()}
        </Avatar>
      </Stack>
    ),
  },
];

export default columns;
