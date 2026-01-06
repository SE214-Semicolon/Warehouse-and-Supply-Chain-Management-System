import { useState } from 'react';
import {
  Card,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { formatDate } from '../../../utils/formatDate';
import POService from '../../../services/po.service';
import { showToast } from '../../../utils/toast';
import { useNavigate } from 'react-router-dom';

export default function PODetailHeader({
  poNo,
  createdAt,
  poId,
  onCancelSuccess,
  canCancel = false,
}) {
  const [openDialog, setOpenDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCancelReason('');
  };

  const handleCancelPO = async () => {
    if (!cancelReason.trim()) {
      showToast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      setLoading(true);
      await POService.cancel(poId, { reason: cancelReason });
      handleCloseDialog();

      if (onCancelSuccess) {
        onCancelSuccess();
      }

      showToast.success('PO cancelled successfully');
      navigate('/procurement');
    } catch (msg) {
      console.error('Error cancelling PO:', msg);
      showToast.error(msg || 'Failed to cancel PO');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card
        sx={{
          padding: 3,
          marginBottom: 3,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
          }}
        >
          <div>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 'bold',
                color: 'text.primary',
              }}
            >
              {poNo}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: '1.125rem',
                color: 'text.secondary',
                marginTop: 1,
              }}
            >
              Created at
              <Box
                component="span"
                sx={{
                  fontWeight: 'semibold',
                  color: 'primary.main',
                  marginLeft: 1,
                }}
              >
                {formatDate(createdAt)}
              </Box>
            </Typography>
          </div>
          <Box
            sx={{
              marginTop: { xs: 2, md: 0 },
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Button
              variant="contained"
              color="error"
              startIcon={<EditIcon size={18} />}
              onClick={handleOpenDialog}
              disabled={!canCancel}
              sx={{
                paddingX: 2.5,
                paddingY: 1.25,
                borderRadius: 1,
                fontWeight: 'medium',
                transition: 'background-color 0.3s ease',
              }}
            >
              Cancel PO
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Cancel Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Purchase Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to cancel PO <strong>{poNo}</strong>? Please
            provide a reason:
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Enter reason for cancellation..."
            variant="outlined"
            required
          />
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Close
          </Button>
          <Button
            onClick={handleCancelPO}
            variant="contained"
            color="error"
            disabled={loading || !cancelReason.trim()}
          >
            {loading ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
