import { Box, Typography, Chip, LinearProgress, Stack } from '@mui/material';
import { Package, MapPin } from 'lucide-react';

const columns = [
  {
    id: 'product',
    label: 'Product & Batch',
    align: 'left',
    width: '25%',
    render: (item) => (
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: 2 }}>
          <Package size={20} color="#64748b" />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight="700">
            {item.productBatch.product.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            SKU: {item.productBatch.product.sku}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <br />
            Batch: {item.productBatch.batchNo}
          </Typography>
        </Box>
      </Stack>
    ),
  },
  {
    id: 'expiryDate',
    label: 'Expiry Date',
    align: 'left',
    width: '15%',
    render: (item) => (
      <Box>
        <Typography variant="body2" fontWeight="600">
          {new Date(item.productBatch.expiryDate).toLocaleDateString('en-GB')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Final expiration date
        </Typography>
      </Box>
    ),
  },
  {
    id: 'lifecycle',
    label: 'Batch Lifecycle',
    align: 'left',
    width: '20%',
    render: (item) => (
      <Box sx={{ width: '100%' }}>
        <Stack direction="row" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary">
            Elapsed
          </Typography>
          <Typography variant="caption" fontWeight="700">
            {item.lifeProgress}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={item.lifeProgress}
          color={
            item.status.severity === 'expired' ||
            item.status.severity === 'urgent'
              ? 'error'
              : 'primary'
          }
          sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9' }}
        />
      </Box>
    ),
  },
  {
    id: 'remaining',
    label: 'Time Remaining',
    align: 'center',
    width: '15%',
    render: (item) => (
      <Chip
        icon={item.status.icon}
        label={
          item.daysRemaining <= 0 ? 'Expired' : `${item.daysRemaining} days`
        }
        color={item.status.color}
        size="small"
        sx={{ fontWeight: 800, borderRadius: 1.5, minWidth: 100 }}
      />
    ),
  },
  {
    id: 'location',
    label: 'Location',
    align: 'left',
    width: '10%',
    render: (item) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <MapPin size={14} color="#64748b" />
        <Typography variant="body2" fontWeight="600">
          {item.location.code}
        </Typography>
      </Stack>
    ),
  },
  {
    id: 'quantity',
    label: 'Quantity',
    align: 'right',
    width: '10%',
    render: (item) => (
      <Box>
        <Typography variant="body2" fontWeight="800">
          {item.availableQty.toLocaleString()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.productBatch.product.unit}
        </Typography>
      </Box>
    ),
  },
];

export default columns;
