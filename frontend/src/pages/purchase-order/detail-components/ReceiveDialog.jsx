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
import POService from '../../../services/po.service';
import UserService from '../../../services/user.service';

export default function ReceiveDialog({ open, onClose, item, onSuccess }) {
  const remaining = item.qtyOrdered - item.qtyReceived;
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const qtyToReceive = parseInt(qty);

    if (!qty || qtyToReceive <= 0 || qtyToReceive > remaining) {
      showToast.error(
        `Please enter a valid quantity to receive (1 - ${remaining})`
      );
      return;
    }
    setLoading(true);

    const user = await UserService.getCurrentUser();
    console.log('user: ', user);

    const payload = {
      items: [
        {
          poItemId: item.id,
          qtyToReceive,
          idempotencyKey: crypto.randomUUID(),
          createdById: user.userId,
        },
      ],
      note: note.trim() || null,
    };

    try {
      const response = await POService.receive(item.purchaseOrderId, payload);
      console.log('Receive response:', response);
      showToast.success('Items received successfully');
      onSuccess && onSuccess(response.data);
      onClose();
    } catch (msg) {
      console.error('Error receiving items:', msg);
      showToast.error(msg || 'Failed to receive items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Receive - {item?.product?.name || 'product'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography>
            Product SKU: <strong>{item?.product?.sku || item.productId}</strong>
          </Typography>
          <Typography>
            Ordered: <strong>{item.qtyOrdered}</strong> | Received:{' '}
            <strong>{item.qtyReceived}</strong>
          </Typography>
          <Typography color="primary">
            Left: <strong>{remaining}</strong>
          </Typography>

          <TextField
            label="Quantity to Receive"
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
          {loading ? 'Processing...' : 'Confirm Receive'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
