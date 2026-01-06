import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import SOItemRow from './SOItemRow';
import { useSOForm } from './useSOForm';
import { Autocomplete, TextField as MuiTextField } from '@mui/material';
import SOService from '../../../../services/so.service';
import { showToast } from '../../../../utils/toast';

export default function FormDialog({
  open,
  onClose,
  mode,
  selectedRow,
  onSuccess,
}) {
  const isEdit = mode === 'edit';
  const isDraft = isEdit ? selectedRow?.status === 'pending' : true;

  const {
    customers,
    products,
    formValues,
    errors,
    loading,
    addItem,
    removeItem,
    updateItem,
    setCustomer,
    validate,
    getPayload,
    setFormValues,
  } = useSOForm({ open, isEdit, selectedRow });

  const totalAmount = formValues.items.reduce(
    (sum, item) => sum + (item.total || 0),
    0
  );

  const handleSaveDraft = async () => {
    if (!validate()) return;

    try {
      const payload = getPayload();
      let res;
      if (isEdit) {
        res = await SOService.update(selectedRow.id, payload);
      } else {
        res = await SOService.create(payload);
      }
      onSuccess?.(res.data || res.data?.data);
      onClose();
    } catch (msg) {
      showToast.error(msg || 'Fail to save!');
    }
  };

  const handleSubmitOrder = async () => {
    if (!validate()) return;

    try {
      let po;
      if (isEdit) {
        const payload = getPayload();
        await SOService.update(selectedRow.id, payload);
        po = await SOService.submitOrder(selectedRow.id);
      } else {
        const payload = getPayload();
        const draftRes = await SOService.create(payload);
        const newId = draftRes.id || draftRes.data?.id;
        po = await SOService.submitOrder(newId);
      }

      onSuccess?.(po.data || po.data?.data);
      onClose();
    } catch (msg) {
      showToast.error(msg || 'Fail to submit!');
    }
  };

  const selectedCustomer =
    customers.find((s) => s.id === formValues.customerId) || null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      key={isEdit ? selectedRow?.id : 'add'}
    >
      <DialogTitle sx={{ fontWeight: 700, color: '#7F408E' }}>
        {isEdit ? 'Edit Sales Order' : 'New Sales Order'}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              disabled={!isDraft}
              options={customers}
              loading={loading.customers}
              value={selectedCustomer}
              onChange={(_, newValue) => setCustomer(newValue?.id || '')}
              getOptionLabel={(option) =>
                option ? `${option.name} (${option.code || '—'})` : ''
              }
              isOptionEqualToValue={(opt, val) => opt.id === val?.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography fontWeight={600}>{option.name}</Typography>
                    {option.code && (
                      <Typography variant="caption" color="text.secondary">
                        Mã: {option.code}
                      </Typography>
                    )}
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <MuiTextField
                  {...params}
                  label="Customer *"
                  error={!!errors.customerId}
                  helperText={errors.customerId || ' '}
                />
              )}
            />
          </Grid>

          {!isEdit && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>
                Product Items
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width="35%">Product *</TableCell>
                    <TableCell width="12%">Code</TableCell>
                    <TableCell width="12%">Amount *</TableCell>
                    <TableCell width="10%">Unit</TableCell>
                    <TableCell width="15%">Unit Price *</TableCell>
                    <TableCell width="16%">Total</TableCell>
                    <TableCell width="5%"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formValues.items.map((item, index) => (
                    <SOItemRow
                      key={index}
                      index={index}
                      item={item}
                      products={products}
                      loadingProducts={loading.products}
                      error={errors.items[index]}
                      disabled={!isDraft}
                      onProductSelect={(product) =>
                        updateItem(index, {
                          productId: product?.id,
                          productName: product?.name,
                          sku: product?.sku || product?.code || '',
                          unit: product?.unit || 'unit',
                          unitPrice:
                            product?.purchasePrice || product?.price || 0,
                        })
                      }
                      onQtyChange={(value) =>
                        updateItem(index, {
                          qty: value,
                        })
                      }
                      onPriceChange={(value) =>
                        updateItem(index, {
                          unitPrice: value,
                        })
                      }
                      onRemove={(index) => removeItem(index)}
                    />
                  ))}
                </TableBody>
              </Table>

              {isDraft && (
                <Button
                  startIcon={<Add />}
                  onClick={addItem}
                  variant="outlined"
                  sx={{ mt: 2 }}
                >
                  Add Product
                </Button>
              )}

              <Box sx={{ mt: 3, textAlign: 'right', pr: 3 }}>
                <Typography variant="h5" color="primary">
                  Total: <strong>{totalAmount.toLocaleString('vi-VN')}</strong>
                </Typography>
              </Box>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Note"
              multiline
              rows={4}
              value={formValues.notes || ''}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, notes: e.target.value }))
              }
              fullWidth
              variant="outlined"
              disabled={!isDraft}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, gap: 2 }}>
        {isDraft && (
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
        )}

        {isDraft && (
          <>
            <Button
              variant="contained"
              color="inherit"
              onClick={handleSaveDraft}
              disabled={formValues.items.length === 0 && !isEdit}
            >
              {isEdit ? 'Update Order' : 'Order'}
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitOrder}
              disabled={formValues.items.length === 0 && !isEdit}
            >
              Submit
            </Button>
          </>
        )}

        {!isDraft && (
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        )}
      </Box>
    </Dialog>
  );
}
