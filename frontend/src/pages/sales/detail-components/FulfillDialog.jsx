import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { showToast } from '@/utils/toast';
import SOService from '../../../services/so.service';

export default function FulfillDialog({ open, onClose, item, onSuccess }) {
  const remaining = item.qty - item.qtyFulfilled;
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const qtyToFulfill = parseInt(qty);

    if (!qty || qtyToFulfill <= 0 || qtyToFulfill > remaining) {
      showToast.error(
        `Please enter a valid quantity to fulfill (1 - ${remaining})`
      );
      return;
    }

    setLoading(true);

    const payload = {
      items: [
        {
          soItemId: item.id,
          qtyToFulfill,
          idempotencyKey: crypto.randomUUID(),
        },
      ],
      note: note.trim() || null,
    };

    try {
      const response = await SOService.fulfill(item.salesOrderId, payload);
      console.log('Receive response:', response);
      showToast.success('Items fulfilled successfully');
      onSuccess && onSuccess(response);
      onClose();
    } catch (msg) {
      console.error('Error fulfilling items:', msg);
      showToast.error(msg || 'Failed to receive items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Fulfill - {item?.product?.name || 'product'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography>
            Product code:{' '}
            <strong>{item?.product?.code || item.productId}</strong>
          </Typography>
          <Typography>
            Ordered: <strong>{item.qty}</strong> | Fulfilled:{' '}
            <strong>{item.qtyFulfilled}</strong>
          </Typography>
          <Typography color="primary">
            Left: <strong>{remaining}</strong>
          </Typography>

          <TextField
            label="Quantity to Fulfill"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputProps={{ min: 1, max: remaining }}
            fullWidth
            required
          />

          <TextField
            label="Note"
            multiline
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !qty}
        >
          {loading ? 'Processing...' : 'Confirm Fulfill'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
