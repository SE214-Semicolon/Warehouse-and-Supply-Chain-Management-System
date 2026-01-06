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
import { HeightOutlined } from "@mui/icons-material";

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
                ? `Max available: ${item.maxQty}`
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
    }
  };

  const handleSubmit = async () => {
    if (!formData.salesOrderId || !formData.warehouseId) {
      alert("Missing Sales Order or Warehouse information.");
      return;
    }

    const hasError = items.some(
      (i) => !i.productBatchId || i.qty <= 0 || i.qty > i.maxQty
    );
    if (hasError) {
      alert("Please check item errors.");
      return;
    }

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

  const columns = useMemo(
    () => [
      { id: "stt", label: "No", search: false },
      {
        id: "salesOrderItemId",
        label: "Select Item to Ship",
        render: (value, row) => {
          const options =
            selectedSODetails?.items?.map((i) => {
              const pName = products.find((p) => p.id === i.productId)?.name || "Unknown";
              const remaining = i.qty - (i.qtyFulfilled || 0);
              return {
                label: `${pName} (Ordered: ${i.qty}, Rem: ${remaining})`,
                value: i.id,
                disabled: remaining <= 0,
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
              sx={{ minWidth: 250 }}
            />
          );
        },
      },
      {
        id: "productBatchId",
        label: "Batch",
        render: (value) => {
          const batchInfo = batches.find((b) => b.id === value);
          const displayLabel = batchInfo ? batchInfo.batchNo : value || "Auto-fill";

          return (
            <FormInput
              value={displayLabel}
              disabled={true}
              placeholder="Auto-fill from SO"
              size="small"
              sx={{ minWidth: 150, bgcolor: "#f5f5f5" }}
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
            sx={{ maxWidth: 150 }}
          />
        ),
      },
    ],
    [selectedSODetails, products, batches, errors, handleRowChange]
  );

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
            1. Select Order
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
                placeholder="Auto-detected from SO Items..."
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
                value={formData.carrier}
                onChange={(v) => handleFormChange("carrier", v)}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormInput
                label="Tracking Code"
                value={formData.trackingCode}
                onChange={(v) => handleFormChange("trackingCode", v)}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormInput
                type="datetime"
                label="Est. Delivery"
                value={formData.estimatedDelivery}
                onChange={(v) => handleFormChange("estimatedDelivery", v)}
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
