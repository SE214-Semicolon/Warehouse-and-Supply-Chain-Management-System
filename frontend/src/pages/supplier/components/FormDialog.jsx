import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Box } from '@mui/material';
import DialogButtons from '@/components/DialogButtons';
import FormInput from '@/components/FormInput';
import SupplierService from '../../../services/supplier.service';
import { showToast } from '@/utils/toast';
import { onlyNumber, onlyLetter, noVietnamese } from '@/utils/inputFilter';

const fields = [
  { id: 'code', label: 'Supplier code', required: true },
  { id: 'name', label: 'Supplier name', required: true },
  { id: 'contactPerson', label: 'Contact person name' },
  { id: 'phone', label: 'Phone number' },
  { id: 'email', label: 'Email', type: 'email' },
  { id: 'address', label: 'Address' },
];

const validateEmail = (email) => {
  if (!email) return true;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  if (!phone) return true;
  const re = /^0\d{9,10}$/;
  return re.test(phone.replace(/[\s-]/g, ''));
};

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
      });
      setErrors({ code: '', name: '' });
    }
  }, [selectedRow, isEdit, open]);

  const handleKeyDown = (e, id) => {
    if (id === 'phone') {
      const allowedKeys = [
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'Tab',
      ];
      if (
        !/[0-9]/.test(e.key) &&
        !allowedKeys.includes(e.key) &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
      }
    }

    if (id === 'name' || id === 'contactPerson') {
      if (/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }
  };

  const handleChange = (id, value) => {
    let v = value;

    switch (id) {
      case 'name':
      case 'contactPerson':
        v = noVietnamese(v);
        v = onlyLetter(v);
        break;

      case 'code':
        v = noVietnamese(v).toUpperCase();
        break;

      case 'phone':
        v = onlyNumber(v);
        break;

      default:
        v = noVietnamese(v);
        break;
    }

    setFormValues((prev) => ({ ...prev, [id]: v }));

    if (errors[id]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formValues.code.trim()) {
      newErrors.code = 'Supplier code is required';
    }
    if (!formValues.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (formValues?.email && !validateEmail(formValues?.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formValues?.phone && !validatePhone(formValues?.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
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
      if (onSuccess) {
        onSuccess();
        showToast.success(
          isEdit
            ? 'Update supplier successfully!'
            : 'Add new supplier successfully!'
        );
      }

      onClose();
    } catch (err) {
      showToast.error(err);
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
        {isEdit ? 'Update supplier' : 'Add new supplier'}
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {fields.map((field) => (
            <FormInput
              key={field.id}
              label={field.label}
              value={formValues[field.id] || ''}
              onChange={(value) => handleChange(field.id, value)}
              onKeyDown={(e) => handleKeyDown(e, field.id)}
              required={field.required}
              type={field.type || 'text'}
              multiline={field.multiline}
              rows={field.rows}
              placeholder={field.placeholder}
              fullWidth
              error={!!errors[field.id]}
              helperText={errors[field.id] || field.helperText}
              autoComplete="off"
            />
          ))}
        </Box>
      </DialogContent>

      <DialogButtons
        onClose={onClose}
        onAction={handleSave}
        actionText={isEdit ? 'Update' : 'Create'}
        actionColor="linear-gradient(90deg, #7F408E, #3A9775)"
      />
    </Dialog>
  );
}
