import { useState } from 'react';
import {
  Card,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { formatDate } from '../../../utils/formatDate';
import SOService from '../../../services/so.service';
import { showToast } from '../../../utils/toast';
import { useNavigate } from 'react-router-dom';

export default function SOHeader({
  soNo,
  createdAt,
  soId,
  onCancelSuccess,
  canCancel = false,
}) {
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleCancelPO = async () => {
    try {
      setLoading(true);
      await SOService.cancel(soId);
      handleCloseDialog();

      if (onCancelSuccess) {
        onCancelSuccess();
      }

      showToast.success('SO cancelled successfully');
      navigate('/sales');
    } catch (msg) {
      console.error('Error cancelling SO:', msg);
      showToast.error(msg || 'Failed to cancel SO');
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
              {soNo}
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
              Cancel SO
            </Button>
          </Box>
        </Box>
      </Card>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Sales Order</DialogTitle>
        <DialogActions sx={{ padding: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Close
          </Button>
          <Button
            onClick={handleCancelPO}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
