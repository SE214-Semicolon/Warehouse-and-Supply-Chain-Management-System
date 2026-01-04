import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import { MapPin, ShoppingCart } from 'lucide-react';

const columns = [
  {
    id: 'product',
    label: 'Product',
    align: 'left',
    width: '25%',
    render: (item) => (
      <Box>
        <Typography variant="subtitle2" fontWeight="700">
          {item.productBatch.product.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', display: 'block' }}
        >
          SKU: {item.productBatch.product.sku} | Unit:{' '}
          {item.productBatch.product.unit}
        </Typography>
      </Box>
    ),
  },
  {
    id: 'location',
    label: 'Location',
    align: 'left',
    width: '15%',
    render: (item) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MapPin size={14} color="#64748b" />
        <Box>
          <Typography variant="body2">{item.location.code}</Typography>
          <Typography variant="caption" color="text.secondary">
            Aisle {item.location.properties.aisle} / Level{' '}
            {item.location.properties.level}
          </Typography>
        </Box>
      </Box>
    ),
  },
  {
    id: 'batch',
    label: 'Batch',
    align: 'left',
    width: '15%',
    render: (item) => (
      <Box>
        <Typography variant="body2">{item.productBatch.batchNo}</Typography>
        <Typography
          variant="caption"
          color={
            new Date(item.productBatch.expiryDate) < new Date()
              ? 'error.main'
              : 'text.secondary'
          }
        >
          Expiry:{' '}
          {new Date(item.productBatch.expiryDate).toLocaleDateString('vi-VN')}
        </Typography>
      </Box>
    ),
  },
  {
    id: 'inventory',
    label: 'Inventory',
    align: 'center',
    width: '15%',
    render: (item) => (
      <>
        <Typography
          variant="body1"
          fontWeight="700"
          color={item.availableQty === 0 ? 'error.main' : 'inherit'}
        >
          {item.availableQty}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={Math.min((item.availableQty / item.minThreshold) * 100, 100)}
          color={item.status.color}
          sx={{ width: 60, mx: 'auto', mt: 0.5, borderRadius: 1, height: 6 }}
        />
      </>
    ),
  },
  {
    id: 'threshold',
    label: 'Threshold',
    align: 'center',
    width: '10%',
    render: (item) => (
      <Typography variant="body2" color="text.secondary">
        {item.minThreshold}
      </Typography>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    align: 'center',
    width: '12%',
    render: (item) => (
      <Chip
        label={item.status.label}
        color={item.status.color}
        size="small"
        sx={{ fontWeight: '600', minWidth: 100 }}
      />
    ),
  },
  {
    id: 'action',
    label: 'Action',
    align: 'center',
    width: '8%',
    render: () => (
      <Tooltip title="Order now">
        <IconButton size="small" color="primary">
          <ShoppingCart size={18} />
        </IconButton>
      </Tooltip>
    ),
  },
];

export default columns;
