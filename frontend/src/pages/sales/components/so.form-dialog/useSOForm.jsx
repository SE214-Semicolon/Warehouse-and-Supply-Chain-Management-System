import { useState, useEffect } from 'react';
import CustomerService from '@/services/customer.service';
import ProductService from '@/services/product.service';

const emptyItem = {
  productId: null,
  productName: '',
  sku: '',
  unit: '',
  qty: 1,
  unitPrice: 0,
  total: 0,
};

export const useSOForm = ({ open, isEdit, selectedRow }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({ customers: true, products: true });

  const [formValues, setFormValues] = useState({
    customerId: '',
    notes: '',
    items: [],
  });

  const [errors, setErrors] = useState({
    customerId: '',
    items: [],
  });

  useEffect(() => {
    if (!open) return;

    setLoading({ customers: true, products: true });

    CustomerService.getAll()
      .then((res) => setCustomers(res.data?.data || res.data || []))
      .finally(() => setLoading((p) => ({ ...p, customers: false })));

    ProductService.getAll()
      .then((res) => setProducts(res.data?.data || res.data || []))
      .finally(() => setLoading((p) => ({ ...p, products: false })));

    if (isEdit && selectedRow) {
      setFormValues({
        customerId: selectedRow.customerId || '',
        notes: selectedRow.notes || '',
        items:
          selectedRow.items?.map((i) => ({
            productId: i.productId,
            productName: i.productName || '',
            sku: i.sku || '',
            unit: i.unit || '',
            qty: i.qty || 1,
            unitPrice: i.unitPrice || 0,
            total: i.qty * i.unitPrice,
          })) || [],
      });
    } else {
      setFormValues({
        customerId: '',
        notes: '',
        items: [],
      });
    }

    setErrors({ customerId: '', items: [] });
  }, [open, isEdit, selectedRow]);

  const addItem = () => {
    setFormValues((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
    setErrors((prev) => ({ ...prev, items: [...prev.items, ''] }));
  };

  const removeItem = (index) => {
    setFormValues((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setErrors((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index, updates) => {
    setFormValues((prev) => {
      const items = [...prev.items];
      const oldItem = items[index];

      if ('qty' in updates) {
        const val = updates.qty;
        if (val === '' || val === null) updates.qty = 1;
        else if (Number(val) < 1) return prev;
        else updates.qty = Number(val);
      }
      if ('unitPrice' in updates) {
        const val = updates.unitPrice;
        if (val === '' || val === null) updates.unitPrice = 0;
        else if (Number(val) < 0) return prev;
        else updates.unitPrice = Number(val);
      }

      items[index] = {
        ...oldItem,
        ...updates,
        total:
          (updates.qty ?? oldItem.qty ?? 1) *
          (updates.unitPrice ?? oldItem.unitPrice ?? 0),
      };

      if (errors.items[index]) {
        const newItemErrors = [...errors.items];
        newItemErrors[index] = '';
        setErrors((prev) => ({ ...prev, items: newItemErrors }));
      }

      return { ...prev, items };
    });
  };

  const setCustomer = (customerId) => {
    setFormValues((prev) => ({ ...prev, customerId }));
    if (customerId) setErrors((prev) => ({ ...prev, customerId: '' }));
  };

  const validate = () => {
    const newErrors = { customerId: '', items: [] };
    let ok = true;

    if (!formValues.customerId) {
      newErrors.customerId = 'Select a customer';
      ok = false;
    }

    formValues.items.forEach((item, i) => {
      if (!item.productId) {
        newErrors.items[i] = 'Select a product';
        ok = false;
      } else if (!item.qty || item.qty < 1) {
        newErrors.items[i] = 'Quantity must be at least 1';
        ok = false;
      } else {
        newErrors.items[i] = '';
      }
    });

    setErrors(newErrors);
    return ok;
  };

  const getPayload = () => ({
    customerId: formValues.customerId,
    notes: formValues.notes.trim(),
    items: formValues.items.map((i) => ({
      productId: i.productId,
      qty: Number(i.qty),
      unitPrice: Number(i.unitPrice),
    })),
  });

  return {
    customers,
    products,
    loading,
    formValues,
    errors,
    addItem,
    removeItem,
    updateItem,
    setCustomer,
    setFormValues,
    validate,
    getPayload,
  };
};
