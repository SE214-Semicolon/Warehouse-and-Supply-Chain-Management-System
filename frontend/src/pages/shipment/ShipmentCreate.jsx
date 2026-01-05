import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Button, Typography, Divider } from "@mui/material";

import ShipmentService from "@/services/shipment.service";
import WarehouseService from "@/services/warehouse.service";
import ProductService from "@/services/product.service";
import BatchService from "@/services/batch.service";
import LocationService from "@/services/location.service";

import FormInput from "@/components/FormInput";
import DataTable from "@/components/DataTable";

const ShipmentCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState([]);

  const [formData, setFormData] = useState({
    carrier: "",
    trackingCode: "",
    estimatedDelivery: null,
    warehouseId: "",
    salesOrderId: "",
    notes: "",
  });

  const [items, setItems] = useState([
    { tempId: Date.now(), productId: "", productBatchId: "", qty: 1 },
  ]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const extractData = (res) => {
          if (!res) return [];
          if (Array.isArray(res)) return res;
          if (res.data && Array.isArray(res.data)) return res.data;
          if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
          return [];
        };

        const [resWarehouse, resProduct, resBatch, resLocation] = await Promise.all([
          WarehouseService.getAll(),
          ProductService.getAll(),
          BatchService.getAll(),
          LocationService.getAll(),
        ]);

        const rawWarehouses = extractData(resWarehouse);
        const rawProducts = extractData(resProduct);
        const rawBatches = extractData(resBatch);
        const rawLocations = extractData(resLocation);

        // ktra dữ liệu
        console.group("DEBUG 1: API RESPONSE");
        console.log("Warehouses:", rawWarehouses.length, rawWarehouses);
        console.log("Locations:", rawLocations.length, rawLocations);
        if (rawLocations.length > 0) console.log("Sample Location:", rawLocations[0]);
        console.log("Batches:", rawBatches.length, rawBatches);
        if (rawBatches.length > 0) console.log("Sample Batch:", rawBatches[0]);
        console.log("Products:", rawProducts.length);
        console.groupEnd();

        setWarehouses(rawWarehouses);
        setProducts(rawProducts);
        setBatches(rawBatches);
        setLocations(rawLocations);
      } catch (e) {
        console.error("Load master data error:", e);
      }
    };
    loadMasterData();
  }, []);

  const validLocationIds = useMemo(() => {
    if (!formData.warehouseId) return [];

    const selectedWhId = String(formData.warehouseId);

    console.group("DEBUG 2: FILTER LOCATIONS");
    console.log("Đang chọn Warehouse ID:", selectedWhId);

    const matchedLocations = locations.filter((l) => {
      const whIdInLoc = String(l.warehouseId || l.warehouse_id || "");
      return whIdInLoc === selectedWhId;
    });

    console.log(`Tìm thấy ${matchedLocations.length} locations thuộc kho này.`);
    console.log("Danh sách location:", matchedLocations);
    console.groupEnd();

    return matchedLocations.map((l) => l.id);
  }, [locations, formData.warehouseId]);

  const batchesInWarehouse = useMemo(() => {
    if (validLocationIds.length === 0) {
      console.log("DEBUG 3: Không có Location nào -> Không có Batch.");
      return [];
    }

    console.group("DEBUG 3: FILTER BATCHES");
    console.log("Danh sách Location IDs hợp lệ:", validLocationIds);

    const matchedBatches = batches.filter((b) => {
      const batchLocId = b.locationId || b.location_id;
      // check location trong batch
      const finalBatchLocId =
        typeof batchLocId === "object" && batchLocId !== null
          ? batchLocId.id
          : batchLocId;

      return validLocationIds.includes(finalBatchLocId);
    });

    console.log(`Tìm thấy ${matchedBatches.length} batches nằm trong các location trên.`);
    console.groupEnd();

    return matchedBatches;
  }, [batches, validLocationIds]);

  // tìm product từ batch
  const productsInWarehouseOptions = useMemo(() => {
    if (!formData.warehouseId) return [];

    const availableProductIds = new Set(
      batchesInWarehouse.map((b) => b.productId || b.product_id)
    );

    console.group("DEBUG 4: FILTER PRODUCTS");
    console.log("Các Product ID có trong Batch:", [...availableProductIds]);

    const finalProducts = products
      .filter((p) => availableProductIds.has(p.id))
      .map((p) => ({ label: p.name, value: p.id }));

    console.log("Kết quả List Product hiển thị:", finalProducts);
    console.groupEnd();

    return finalProducts;
  }, [products, batchesInWarehouse, formData.warehouseId]);

  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ label: w.name, value: w.id })),
    [warehouses]
  );

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      if (field === "warehouseId" && prev.warehouseId !== value) {
        setItems([{ tempId: Date.now(), productId: "", productBatchId: "", qty: 1 }]);
        return { ...prev, [field]: value };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleItemChange = (tempId, field, value) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.tempId !== tempId) return item;
        if (field === "productId") {
          return { ...item, [field]: value, productBatchId: "" };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleAddItem = () => {
    if (!formData.warehouseId) {
      alert("Vui lòng chọn Kho trước!");
      return;
    }
    setItems([
      ...items,
      { tempId: Date.now(), productId: "", productBatchId: "", qty: 1 },
    ]);
  };

  const handleDeleteItem = (row) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.tempId !== row.tempId));
  };

  const handleSubmit = async () => {
    if (!formData.salesOrderId) {
      alert("Vui lòng nhập Sales Order ID!");
      return;
    }
    if (!formData.warehouseId) {
      alert("Vui lòng chọn Kho!");
      return;
    }

    const validItems = items.filter((i) => i.productId && i.qty > 0);
    if (validItems.length === 0) {
      alert("Cần ít nhất một sản phẩm hợp lệ");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        salesOrderId: formData.salesOrderId,
        warehouseId: formData.warehouseId,
        carrier: formData.carrier,
        trackingCode: formData.trackingCode,
        notes: formData.notes || "",
        estimatedDelivery: formData.estimatedDelivery
          ? new Date(formData.estimatedDelivery).toISOString()
          : null,
        items: validItems.map((item) => ({
          salesOrderId: formData.salesOrderId,
          productId: item.productId,
          productBatchId: item.productBatchId,
          qty: Number(item.qty),
        })),
      };
      await ShipmentService.create(payload);
      navigate("/shipments");
    } catch (error) {
      alert(error.message || "Lỗi tạo shipment");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      { id: "stt", label: "No", render: (val, row, index) => index + 1 },
      {
        id: "productId",
        label: "Product",
        render: (value, row) => (
          <FormInput
            type="select"
            options={productsInWarehouseOptions}
            value={value}
            onChange={(val) => handleItemChange(row.tempId, "productId", val)}
            size="small"
            placeholder={
              formData.warehouseId ? "Select Product" : "Select Warehouse First"
            }
            disabled={!formData.warehouseId}
            sx={{ minWidth: 200, mb: 0 }}
          />
        ),
      },
      {
        id: "productBatchId",
        label: "Batch",
        render: (value, row) => {
          const currentProdId = String(row.productId || "");
          const batchOptionsForRow = batchesInWarehouse
            .filter((b) => String(b.productId || b.product_id) === currentProdId)
            .map((b) => ({
              label: b.batchNo || b.name || `Batch #${b.id.substring(0, 6)}`,
              value: b.id,
            }));

          return (
            <FormInput
              type="select"
              disabled={!row.productId}
              options={batchOptionsForRow}
              value={value}
              onChange={(val) => handleItemChange(row.tempId, "productBatchId", val)}
              placeholder="Select Batch"
              size="small"
              sx={{ minWidth: 150, mb: 0 }}
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
            onChange={(val) => handleItemChange(row.tempId, "qty", val)}
            size="small"
            sx={{ maxWidth: 100, mb: 0 }}
          />
        ),
      },
    ],
    [productsInWarehouseOptions, batchesInWarehouse, formData.warehouseId]
  );

  return (
    <Box sx={{ maxWidth: "1200px", mx: "auto", py: 3, px: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Create New Shipment (Debug Mode)
        </Typography>
        <Button onClick={() => navigate("/shipments")}>Back to List</Button>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" mb={2}>
            General Info
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FormInput
                type="text"
                label="Sales Order ID (UUID)"
                required
                value={formData.salesOrderId}
                onChange={(v) => handleFormChange("salesOrderId", v)}
                placeholder="Paste Sales Order UUID here..."
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormInput
                type="select"
                label="Warehouse"
                required
                options={warehouseOptions}
                value={formData.warehouseId}
                onChange={(v) => handleFormChange("warehouseId", v)}
                placeholder="Chọn kho xuất..."
              />
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FormInput
                label="Tracking Code"
                value={formData.trackingCode}
                onChange={(v) => handleFormChange("trackingCode", v)}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormInput
                label="Carrier"
                value={formData.carrier}
                onChange={(v) => handleFormChange("carrier", v)}
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
            <Typography variant="h6">Shipment Items</Typography>
            <Button variant="outlined" onClick={handleAddItem}>
              + Add Item
            </Button>
          </Box>
          <DataTable columns={columns} data={items} onDelete={handleDeleteItem} />
        </Paper>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate("/shipments")}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            Create Shipment
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ShipmentCreate;
