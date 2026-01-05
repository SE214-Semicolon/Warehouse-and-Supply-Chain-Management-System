// src/pages/procurement/tabs/purchase-order/components/FormDialog.jsx
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
import FormInput from '@/components/FormInput';
// import DialogButtons from '@/components/DialogButtons';
import POItemRow from './POItemRow';
import { usePOForm } from './usePOForm';
import { Autocomplete, TextField as MuiTextField } from '@mui/material';
import POService from '../../../services/po.service';

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
    } catch (err) {
      alert(err?.message || 'Lưu nháp thất bại!');
    }
  };

  const handleSubmitOrder = async () => {
    if (!validate()) return;
    if (formValues.items.length === 0) {
      alert('Phải có ít nhất 1 sản phẩm');
      return;
    }

    try {
      let po;
      if (isEdit) {
        // Nếu đang edit draft → cập nhật trước, rồi submit
        const payload = getPayload();
        await POService.update(selectedRow.id, payload);
        po = await POService.submitOrder(selectedRow.id);
      } else {
        // Tạo mới → draft trước, rồi submit luôn
        const payload = getPayload();
        const draftRes = await POService.createDraft(payload);
        const newId = draftRes.id || draftRes.data?.id;
        po = await POService.submitOrder(newId);
      }

      onSuccess?.(po.data || po.data?.data);
      onClose();
    } catch (err) {
      alert(err?.message || 'Đặt hàng thất bại!');
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
        {isEdit ? 'Sửa Purchase Order' : 'Tạo Purchase Order mới'}
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
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
                  label="Nhà cung cấp *"
                  error={!!errors.supplierId}
                  helperText={errors.supplierId || ' '}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Ngày giao hàng dự kiến"
              type="date"
              value={formValues.expectedArrival || ''}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  expectedArrival: e.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
              error={!!errors.expectedArrival}
              helperText={errors.expectedArrival || ' '}
              fullWidth
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom>
              Danh sách sản phẩm
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="35%">Sản phẩm *</TableCell>
                  <TableCell width="12%">Mã SP</TableCell>
                  <TableCell width="12%">SL *</TableCell>
                  <TableCell width="10%">ĐV</TableCell>
                  <TableCell width="15%">Đơn giá *</TableCell>
                  <TableCell width="16%">Thành tiền</TableCell>
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
                        unit: product?.unit || 'Cái',
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
              <Button
                startIcon={<Add />}
                onClick={addItem}
                variant="outlined"
                sx={{ mt: 2 }}
              >
                Thêm sản phẩm
              </Button>
            )}

            <Box sx={{ mt: 3, textAlign: 'right', pr: 3 }}>
              <Typography variant="h5" color="primary">
                Tổng tiền:{' '}
                <strong>{totalAmount.toLocaleString('vi-VN')} ₫</strong>
              </Typography>
            </Box>
          </Grid>

          {/* Ghi chú */}
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Ghi chú"
              multiline
              rows={4}
              value={formValues.notes || ''}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, notes: e.target.value }))
              }
              fullWidth
              variant="outlined"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, gap: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Hủy
        </Button>

        {isDraft && (
          <>
            <Button
              variant="contained"
              color="inherit"
              onClick={handleSaveDraft}
            >
              {isEdit ? 'Cập nhật nháp' : 'Lưu nháp'}
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitOrder}
              disabled={formValues.items.length === 0}
            >
              {isEdit ? 'Đặt hàng lại' : 'Đặt hàng'}
            </Button>
          </>
        )}

        {!isDraft && (
          <Button onClick={onClose} variant="contained">
            Đóng
          </Button>
        )}
      </Box>
    </Dialog>
  );
}
