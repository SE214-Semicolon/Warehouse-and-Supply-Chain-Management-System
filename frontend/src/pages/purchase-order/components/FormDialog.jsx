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
import { Add, Upload as UploadIcon } from '@mui/icons-material';
import POItemRow from './POItemRow';
import { usePOForm } from './usePOForm';
import { Autocomplete, TextField as MuiTextField } from '@mui/material';
import POService from '../../../services/po.service';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
dayjs.locale('vi');
import { showToast } from '../../../utils/toast';

export default function FormDialog({
  open,
  onClose,
  mode,
  selectedRow,
  onSuccess,
}) {
  const isEdit = mode === 'edit';
  const isDraft = isEdit ? selectedRow?.status === 'draft' : true;

  const {
    suppliers,
    products,
    formValues,
    errors,
    loading,
    addItem,
    removeItem,
    updateItem,
    setSupplier,
    validate,
    getPayload,
    setFormValues,
    handleImportItems,
  } = usePOForm({ open, isEdit, selectedRow });

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
        res = await POService.update(selectedRow.id, payload);
      } else {
        res = await POService.createDraft(payload);
      }
      onSuccess?.(res.data || res.data?.data);
      onClose();
    } catch (msg) {
      showToast.error(msg || 'Fail to save draft!');
    }
  };

  const handleSubmitOrder = async () => {
    if (!validate()) return;

    try {
      let po;
      if (isEdit) {
        const payload = getPayload();
        await POService.update(selectedRow.id, payload);
        po = await POService.submitOrder(selectedRow.id);
      } else {
        const payload = getPayload();
        const draftRes = await POService.createDraft(payload);
        const newId = draftRes.id || draftRes.data?.id;
        po = await POService.submitOrder(newId);
      }

      onSuccess?.(po.data || po.data?.data);
      onClose();
    } catch (msg) {
      showToast.error(msg || 'Fail to submit order!');
    }
  };

  const selectedSupplier =
    suppliers.find((s) => s.id === formValues.supplierId) || null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      key={isEdit ? selectedRow?.id : 'add'}
    >
      <DialogTitle sx={{ fontWeight: 700, color: '#7F408E' }}>
        {isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              disabled={!isDraft}
              options={suppliers}
              loading={loading.suppliers}
              value={selectedSupplier}
              onChange={(_, newValue) => setSupplier(newValue?.id || '')}
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
                  label="Supplier *"
                  error={!!errors.supplierId}
                  helperText={errors.supplierId || ' '}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <DatePicker
              label="Expected Arrival Date"
              format="DD/MM/YYYY"
              value={
                formValues.expectedArrival
                  ? dayjs(formValues.expectedArrival)
                  : null
              }
              onChange={(newValue) => {
                setFormValues((prev) => ({
                  ...prev,
                  expectedArrival: newValue
                    ? newValue.format('YYYY-MM-DD')
                    : '',
                }));
              }}
              disabled={!isDraft}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.expectedArrival,
                  helperText: errors.expectedArrival || ' ',
                },
              }}
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
                    <POItemRow
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
                        updateItem(index, { qtyOrdered: value })
                      }
                      onPriceChange={(value) =>
                        updateItem(index, { unitPrice: value })
                      }
                      onRemove={(index) => removeItem(index)}
                    />
                  ))}
                </TableBody>
              </Table>

              {isDraft && (
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    startIcon={<Add />}
                    onClick={addItem}
                    variant="outlined"
                    sx={{ mt: 2 }}
                  >
                    Add Product
                  </Button>
                  <Button
                    startIcon={<UploadIcon />}
                    variant="outlined"
                    component="label"
                    disabled={loading.products}
                  >
                    Import Items (CSV)
                    <input
                      type="file"
                      hidden
                      accept=".csv"
                      onChange={(e) => handleImportItems(e.target.files[0])}
                    />
                  </Button>
                </Box>
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
              {isEdit ? 'Update Draft' : 'Save as Draft'}
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitOrder}
              disabled={formValues.items.length === 0 && !isEdit}
            >
              Order
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
