import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Button, Typography, Divider } from "@mui/material";

import ShipmentService from "@/services/shipment.service";
import WarehouseService from "@/services/warehouse.service";
import ProductService from "@/services/product.service";
import BatchService from "@/services/batch.service";
import LocationService from "@/services/location.service";
import SOService from "@/services/so.service";

import FormInput from "@/components/FormInput";
import DataTable from "@/components/DataTable";

const ShipmentCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [warehouses, setWarehouses] = useState([]);
  const [allSalesOrders, setAllSalesOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedSODetails, setSelectedSODetails] = useState(null);

  const [formData, setFormData] = useState({
    warehouseId: "",
    salesOrderId: "",
    carrier: "",
    trackingCode: "",
    estimatedDelivery: null,
    notes: "",
  });

  const [items, setItems] = useState([
    {
      tempId: Date.now(),
      salesOrderItemId: "",
      productId: "",
      productBatchId: "",
      qty: 1,
      maxQty: 0,
    },
  ]);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const extract = (res) => res?.data?.data || res?.data || res || [];
        const [resWh, resProd, resBatch, resLoc, resSO] = await Promise.all([
          WarehouseService.getAll(),
          ProductService.getAll(),
          BatchService.getAll(),
          LocationService.getAll(),
          SOService.getAll(),
        ]);

        setWarehouses(extract(resWh));
        setProducts(extract(resProd));
        setBatches(extract(resBatch));
        setLocations(extract(resLoc));
        setAllSalesOrders(extract(resSO));
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchSODetails = async () => {
      if (!formData.salesOrderId) {
        setSelectedSODetails(null);
        setFormData((prev) => ({ ...prev, warehouseId: "" }));
        return;
      }

      try {
        const res = await SOService.getById(formData.salesOrderId);
        const data = res.data || res;

        if (data) {
          setSelectedSODetails(data);
          setItems([
            {
              tempId: Date.now(),
              salesOrderItemId: "",
              productId: "",
              productBatchId: "",
              qty: 1,
              maxQty: 0,
            },
          ]);
          setErrors({});

          if (data.items && data.items.length > 0) {
            const firstItemWithLocation = data.items.find((i) => i.locationId);
            if (firstItemWithLocation) {
              const foundLoc = locations.find(
                (l) => l.id === firstItemWithLocation.locationId
              );
              if (foundLoc && foundLoc.warehouseId) {
                setFormData((prev) => ({
                  ...prev,
                  warehouseId: foundLoc.warehouseId,
                }));
              }
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (locations.length > 0) {
      fetchSODetails();
    }
  }, [formData.salesOrderId, locations]);

  const handleFormChange = (field, value) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErr = { ...prev };
        delete newErr[field];
        return newErr;
      });
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRowChange = useCallback(
    (tempId, field, value) => {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.tempId !== tempId) return item;

          if (field === "salesOrderItemId") {
            const soItem = selectedSODetails?.items?.find((i) => i.id === value);
            if (!soItem) return item;

            const remaining = soItem.qty - (soItem.qtyFulfilled || 0);

            setErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[`items.${tempId}.qty`];
              delete newErrors[`items.${tempId}.salesOrderItemId`];
              return newErrors;
            });

            return {
              ...item,
              salesOrderItemId: value,
              productId: soItem.productId,
              productBatchId: soItem.productBatchId,
              maxQty: remaining,
              qty: remaining > 0 ? remaining : 0,
            };
          }

          if (field === "qty") {
            const val = Number(value);
            const isError = val > item.maxQty;

            setErrors((prev) => ({
              ...prev,
              [`items.${tempId}.qty`]: isError
                ? `Max remaining: ${item.maxQty}`
                : val <= 0
                ? "Must > 0"
                : null,
            }));
          }

          return { ...item, [field]: value };
        })
      );
    },
    [selectedSODetails]
  );

  const handleAddItem = () => {
    if (!formData.salesOrderId) return;
    setItems([
      ...items,
      {
        tempId: Date.now(),
        salesOrderItemId: "",
        productId: "",
        productBatchId: "",
        qty: 1,
        maxQty: 0,
      },
    ]);
  };

  const handleDeleteItem = (row) => {
    if (items.length > 1) {
      setItems(items.filter((i) => i.tempId !== row.tempId));
      setErrors((prev) => {
        const newErr = { ...prev };
        delete newErr[`items.${row.tempId}.qty`];
        delete newErr[`items.${row.tempId}.salesOrderItemId`];
        return newErr;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.carrier?.trim()) {
      newErrors.carrier = "Carrier is required";
      isValid = false;
    }
    if (!formData.trackingCode?.trim()) {
      newErrors.trackingCode = "Tracking Code is required";
      isValid = false;
    }
    if (!formData.estimatedDelivery) {
      newErrors.estimatedDelivery = "Estimated Delivery is required";
      isValid = false;
    }

    const selectedIds = items.map((i) => i.salesOrderItemId).filter((id) => id);

    items.forEach((item) => {
      if (!item.salesOrderItemId) {
        newErrors[`items.${item.tempId}.salesOrderItemId`] = "Required";
        isValid = false;
      } else {
        const count = selectedIds.filter((id) => id === item.salesOrderItemId).length;
        if (count > 1) {
          newErrors[`items.${item.tempId}.salesOrderItemId`] = "Duplicate Item!";
          isValid = false;
        }
      }

      if (item.qty <= 0) {
        newErrors[`items.${item.tempId}.qty`] = "Must > 0";
        isValid = false;
      } else if (item.qty > item.maxQty) {
        newErrors[`items.${item.tempId}.qty`] = `Max remaining: ${item.maxQty}`;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!formData.salesOrderId || !formData.warehouseId) {
      alert("Missing Sales Order or Warehouse information.");
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        estimatedDelivery: formData.estimatedDelivery
          ? new Date(formData.estimatedDelivery).toISOString()
          : null,
        items: items.map((i) => ({
          salesOrderId: formData.salesOrderId,
          productId: i.productId,
          productBatchId: i.productBatchId,
          qty: Number(i.qty),
        })),
      };

      await ShipmentService.create(payload);
      navigate("/shipments");
    } catch (e) {
      alert(e.message || "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => {
    const getOtherSelectedIds = (currentTempId) => {
      return items
        .filter((i) => i.tempId !== currentTempId && i.salesOrderItemId)
        .map((i) => i.salesOrderItemId);
    };

    const commonInputSx = {
      "& .MuiOutlinedInput-root": { height: "40px", alignItems: "center" },
      "& .MuiInputBase-input": {
        height: "40px",
        padding: "0 14px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
      },
    };

    return [
      { id: "stt", label: "No", search: false },
      {
        id: "salesOrderItemId",
        label: "Select Item to Ship",
        render: (value, row) => {
          const otherSelectedIds = getOtherSelectedIds(row.tempId);

          const isDuplicateRealtime = value && otherSelectedIds.includes(value);
          const submitError = errors[`items.${row.tempId}.salesOrderItemId`];
          const hasError = isDuplicateRealtime || !!submitError;
          const errorMessage = isDuplicateRealtime ? "Duplicate Item!" : submitError;

          const options =
            selectedSODetails?.items?.map((i) => {
              const pName = products.find((p) => p.id === i.productId)?.name || "Unknown";
              const remaining = i.qty - (i.qtyFulfilled || 0);
              const isSelectedElsewhere = otherSelectedIds.includes(i.id);

              return {
                label: isSelectedElsewhere
                  ? `${pName} (Selected)`
                  : `${pName} (Ord: ${i.qty}, Rem: ${remaining})`,
                value: i.id,
                disabled: remaining <= 0 || isSelectedElsewhere,
              };
            }) || [];

          return (
            <FormInput
              type="select"
              options={options}
              value={value}
              onChange={(val) => handleRowChange(row.tempId, "salesOrderItemId", val)}
              placeholder={!selectedSODetails ? "Select SO First" : "Select Product..."}
              disabled={!selectedSODetails}
              size="small"
              sx={{ minWidth: 250, ...commonInputSx }}
              error={hasError}
              helperText={errorMessage}
            />
          );
        },
      },
      {
        id: "productBatchId",
        label: "Batch",
        render: (value) => {
          const batchInfo = batches.find((b) => b.id === value);
          const displayLabel = batchInfo ? batchInfo.batchNo : value || "";
          return (
            <FormInput
              value={displayLabel}
              disabled={true}
              placeholder="Auto-fill"
              size="small"
              sx={{ minWidth: 150, bgcolor: "#f5f5f5", ...commonInputSx }}
            />
          );
        },
      },
      {
        id: "qty",
        label: "Quantity",
        render: (value, row) => (
          <FormInput
            type="number"
            value={value}
            onChange={(val) => handleRowChange(row.tempId, "qty", val)}
            size="small"
            error={!!errors[`items.${row.tempId}.qty`]}
            helperText={errors[`items.${row.tempId}.qty`]}
            sx={{ maxWidth: 150, ...commonInputSx }}
          />
        ),
      },
    ];
  }, [selectedSODetails, products, batches, errors, handleRowChange, items]);

  const salesOrderOptions = useMemo(
    () =>
      allSalesOrders.map((so) => ({
        label: `${so.soNo} (${so.customer?.name || "Unknown"})`,
        value: so.id,
      })),
    [allSalesOrders]
  );

  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ label: w.name, value: w.id })),
    [warehouses]
  );

  return (
    <Box sx={{ maxWidth: "1200px", mx: "auto", py: 3, px: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Create Shipment
        </Typography>
        <Button onClick={() => navigate("/shipments")}>Back</Button>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" mb={2} color="primary">
            1. Select Order & Info
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", md: "row" },
              mb: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <FormInput
                type="select"
                label="Sales Order"
                required
                options={salesOrderOptions}
                value={formData.salesOrderId}
                onChange={(v) => handleFormChange("salesOrderId", v)}
                placeholder="Select Sales Order..."
              />
            </Box>

            <Box sx={{ flex: 1 }}>
              <FormInput
                type="select"
                label="Warehouse (Auto-Detected)"
                required
                options={warehouseOptions}
                value={formData.warehouseId}
                disabled={true}
                placeholder="Auto-detected..."
                sx={{ bgcolor: "#f5f5f5" }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", md: "row" },
              mb: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <FormInput
                label="Carrier"
                required
                value={formData.carrier}
                onChange={(v) => handleFormChange("carrier", v)}
                error={!!errors.carrier}
                helperText={errors.carrier}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormInput
                label="Tracking Code"
                required
                value={formData.trackingCode}
                onChange={(v) => handleFormChange("trackingCode", v)}
                error={!!errors.trackingCode}
                helperText={errors.trackingCode}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormInput
                type="datetime"
                label="Est. Delivery"
                required
                value={formData.estimatedDelivery}
                onChange={(v) => handleFormChange("estimatedDelivery", v)}
                error={!!errors.estimatedDelivery}
                helperText={errors.estimatedDelivery}
              />
            </Box>
          </Box>

          <Box>
            <FormInput
              label="Notes"
              multiline
              rows={2}
              value={formData.notes}
              onChange={(v) => handleFormChange("notes", v)}
            />
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" color="primary">
              2. Confirm Items
            </Typography>
            <Button
              variant="outlined"
              onClick={handleAddItem}
              disabled={!formData.salesOrderId}
            >
              + Add Item
            </Button>
          </Box>

          <DataTable columns={columns} data={items} onDelete={handleDeleteItem} />

          {!formData.salesOrderId && (
            <Typography
              align="center"
              sx={{ mt: 2, fontStyle: "italic", color: "text.secondary" }}
            >
              Please select a Sales Order first.
            </Typography>
          )}
        </Paper>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate("/shipments")}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Shipment"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ShipmentCreate;
