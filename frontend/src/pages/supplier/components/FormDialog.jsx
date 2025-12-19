import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Box } from '@mui/material';
import DialogButtons from '@/components/DialogButtons';
import FormInput from '@/components/FormInput';
import SupplierService from '../../../services/supplier.service';

const fields = [
  { id: 'code', label: 'Mã nhà cung cấp', required: true },
  { id: 'name', label: 'Tên nhà cung cấp', required: true },
  { id: 'contactPerson', label: 'Người liên hệ' },
  { id: 'phone', label: 'Điện thoại' },
  { id: 'email', label: 'Email', type: 'email' },
  { id: 'address', label: 'Địa chỉ' },
  {
    id: 'extraInfo',
    label: 'Thông tin bổ sung',
    multiline: true,
    rows: 4,
    placeholder: `Ví dụ gõ mỗi dòng 1 thông tin:\nZalo: 0901234567\nFacebook: abc.company\nSkype: supplier_abc\nGhi chú: Giao hàng buổi sáng`,
    helperText: 'Mỗi dòng là một thông tin (Zalo, Facebook, Skype, ghi chú...)',
  },
];

export default function FormDialog({
  open,
  onClose,
  mode,
  selectedRow,
  onSuccess,
}) {
  const isEdit = mode === 'edit';

  const [formValues, setFormValues] = useState({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    extraInfo: '',
  });

  const [errors, setErrors] = useState({
    code: '',
    name: '',
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && selectedRow) {
      const ci = selectedRow.contactInfo || {};
      setFormValues({
        code: selectedRow.code || '',
        name: selectedRow.name || '',
        contactPerson: ci.contactPerson || '',
        phone: ci.phone || '',
        email: ci.email || '',
        address: selectedRow.address || '',
        extraInfo: ci.extraInfo || '',
      });
      setErrors({ code: '', name: '' });
    } else {
      setFormValues({
        code: '',
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        extraInfo: '',
      });
      setErrors({ code: '', name: '' });
    }
  }, [selectedRow, isEdit, open]);

  const handleChange = (id, value) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
  };

  const handleSave = async () => {
    setErrors({ code: '', name: '' });

    let hasError = false;
    const newErrors = {};
    if (!formValues.code.trim()) {
      newErrors.code = 'Vui lòng nhập mã nhà cung cấp';
      hasError = true;
    }
    if (!formValues.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên nhà cung cấp';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      code: formValues.code.trim(),
      name: formValues.name.trim(),
      address: formValues.address.trim() || null,
      contactInfo: {
        contactPerson: formValues.contactPerson.trim() || null,
        phone: formValues.phone.trim() || null,
        email: formValues.email.trim() || null,
        extraInfo: formValues.extraInfo.trim() || null,
      },
    };

    try {
      let result;
      if (isEdit) {
        result = await SupplierService.update(selectedRow.id, payload);
      } else {
        result = await SupplierService.create(payload);
      }
      console.log(result.data);
      if (onSuccess) onSuccess(result.data);
      onClose();
    } catch (err) {
      console.log(err);
      const msg = err.response?.data?.message || 'Lưu thất bại!';
      alert(msg);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          background: 'linear-gradient(90deg, #7F408E, #3A9775)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {isEdit ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {fields.map((field) => (
            <FormInput
              key={field.id}
              label={field.label}
              value={formValues[field.id] || ''}
              onChange={(value) => handleChange(field.id, value)}
              required={field.required}
              type={field.type || 'text'}
              multiline={field.multiline}
              rows={field.rows}
              placeholder={field.placeholder}
              fullWidth
              error={!!errors[field.id]}
              helperText={errors[field.id] || field.helperText}
            />
          ))}
        </Box>
      </DialogContent>

      <DialogButtons
        onClose={onClose}
        onAction={handleSave}
        actionText={isEdit ? 'Cập nhật' : 'Thêm mới'}
        actionColor="linear-gradient(90deg, #7F408E, #3A9775)"
      />
    </Dialog>
  );
}
