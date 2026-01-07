import { useState, useEffect } from 'react';
import SupplierService from '@/services/supplier.service';
import ProductService from '@/services/product.service';
import Papa from 'papaparse';
import { showToast } from '@/utils/toast';

const emptyItem = {
  productId: null,
  productName: '',
  sku: '',
  unit: '',
  qtyOrdered: 1,
  unitPrice: 0,
  total: 0,
};

export const usePOForm = ({ open, isEdit, selectedRow }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({ suppliers: true, products: true });

  const [formValues, setFormValues] = useState({
    supplierId: '',
    expectedArrival: '',
    notes: '',
    items: [],
  });

  const [errors, setErrors] = useState({
    supplierId: '',
    expectedArrival: '',
    items: [],
  });

  useEffect(() => {
    if (!open) return;

    setLoading({ suppliers: true, products: true });

    SupplierService.getAll()
      .then((res) => setSuppliers(res.data?.data || res.data || []))
      .finally(() => setLoading((p) => ({ ...p, suppliers: false })));

    ProductService.getAll()
      .then((res) => setProducts(res.data?.data || res.data || []))
      .finally(() => setLoading((p) => ({ ...p, products: false })));

    if (isEdit && selectedRow) {
      setFormValues({
        supplierId: selectedRow.supplierId || '',
        expectedArrival: selectedRow.expectedArrival?.slice(0, 10) || '',
        notes: selectedRow.notes || '',
        items:
          selectedRow.items?.map((i) => ({
            productId: i.productId,
            productName: i.productName || '',
            sku: i.sku || '',
            unit: i.unit || '',
            qtyOrdered: i.qtyOrdered || 1,
            unitPrice: i.unitPrice || 0,
            total: (i.qtyOrdered || 1) * (i.unitPrice || 0),
          })) || [],
      });
    } else {
      setFormValues({
        supplierId: '',
        expectedArrival: '',
        notes: '',
        items: [],
      });
    }

    setErrors({ supplierId: '', expectedArrival: '', items: [] });
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

      if ('qtyOrdered' in updates) {
        const val = updates.qtyOrdered;
        if (val === '' || val === null) updates.qtyOrdered = 1;
        else if (Number(val) < 1) return prev;
        else updates.qtyOrdered = Number(val);
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
          (updates.qtyOrdered ?? oldItem.qtyOrdered ?? 1) *
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

  const setSupplier = (supplierId) => {
    setFormValues((prev) => ({ ...prev, supplierId }));
    if (supplierId) setErrors((prev) => ({ ...prev, supplierId: '' }));
  };

  const validate = () => {
    const newErrors = { supplierId: '', expectedArrival: '', items: [] };
    let ok = true;

    if (!formValues.supplierId) {
      newErrors.supplierId = 'Select a supplier';
      ok = false;
    }

    if (formValues.expectedArrival) {
      const picked = new Date(formValues.expectedArrival);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (picked < today) {
        newErrors.expectedArrival =
          'Expected arrival date cannot be in the past';
        ok = false;
      }
    }

    formValues.items.forEach((item, i) => {
      if (!item.productId) {
        newErrors.items[i] = 'Select a product';
        ok = false;
      } else if (!item.qtyOrdered || item.qtyOrdered < 1) {
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
    supplierId: formValues.supplierId,
    expectedArrival: formValues.expectedArrival || null,
    notes: formValues.notes,
    items: formValues.items.map((i) => ({
      productId: i.productId,
      qtyOrdered: Number(i.qtyOrdered),
      unitPrice: Number(i.unitPrice),
    })),
  });

  const handleImportItems = (file) => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const skippedRows = [];
        const newItems = results.data
          .map((row) => {
            // Tìm product bằng code hoặc sku
            const product = products.find(
              (p) =>
                p.code === row['Product Code'] ||
                p.sku === row['Product Code'] ||
                p.name === row['Product Name'] // optional nếu có cột name
            );

            if (!product) {
              skippedRows.push(row['Product Code'] || row['Product Name']);
              return null;
            }

            const qty = parseInt(row.Quantity, 10);
            const price = parseFloat(row['Unit Price']);

            if (isNaN(qty) || qty < 1 || isNaN(price) || price < 0) {
              skippedRows.push(row['Product Code'] || row['Product Name']);
              return null;
            }

            return {
              productId: product.id,
              productName: product.name,
              sku: product.sku || '',
              unit: product.unit || 'unit',
              qtyOrdered: qty,
              unitPrice: price,
              total: qty * price,
            };
          })
          .filter(Boolean); // Lọc bỏ null

        if (newItems.length > 0) {
          setFormValues((prev) => ({
            ...prev,
            items: [...prev.items, ...newItems],
          }));
          setErrors((prev) => ({
            ...prev,
            items: [...prev.items, ...newItems.map(() => '')],
          }));
          showToast.success(
            `Đã import thành công ${newItems.length} sản phẩm!`
          );
        }

        if (skippedRows.length > 0) {
          showToast.warning(
            `Bỏ qua ${skippedRows.length} dòng không hợp lệ: ${skippedRows.join(
              ', '
            )}`
          );
        }

        if (newItems.length === 0 && skippedRows.length === 0) {
          showToast.error('File CSV không có dữ liệu hợp lệ!');
        }
      },
      error: (err) => {
        showToast.error('Lỗi đọc file: ' + err.message);
      },
    });
  };

  return {
    suppliers,
    products,
    loading,
    formValues,
    errors,
    addItem,
    removeItem,
    updateItem,
    setSupplier,
    setFormValues,
    validate,
    getPayload,
    handleImportItems,
  };
};
