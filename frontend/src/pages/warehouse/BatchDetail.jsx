import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import ProductBatchService from "@/services/batch.service";
import InventoryService from "@/services/inventory.service";
import LocationService from "@/services/location.service";
import UserService from "@/services/user.service";
import { formatDate } from "@/utils/formatDate";
import { convertDate } from "@/utils/convertDate";

import DetailHeader from "./components/DetailHeader";
import InfoCard from "./components/InfoCard";
import EmptyStateCard from "./components/EmptyStateCard";
import FormDialog from "./components/FormDialog";

import BatchActions from "./components/batch_detail/BatchActions";
import BatchTabsSection from "./components/batch_detail/BatchTabsSection";
import MovementDialog from "./components/batch_detail/MovementDialog";

const BatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openMovementDialog, setOpenMovementDialog] = useState(false);
  const [movementType, setMovementType] = useState("");

  useEffect(() => {
    const initData = async () => {
      try {
        const [user, locRes] = await Promise.all([
          UserService.getCurrentUser(),
          LocationService.getAll(),
        ]);
        setCurrentUser(user);
        setLocations(
          locRes.data?.locations ?? locRes.data?.data?.locations ?? []
        );
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };
    initData();
  }, []);

  const fetchBatchData = useCallback(async () => {
    setLoading(true);
    try {
      const batchRes = await ProductBatchService.getById(id);
      const batchData = batchRes?.data || batchRes;

      if (!batchData) {
        setBatch(null);
      } else {
        setBatch(batchData);
        const invRes = await InventoryService.getByBatch(id);
        setInventory(invRes?.inventories || []);
        setMovements(invRes.data?.movements || []);
      }
    } catch (error) {
      console.error("Error fetching batch:", error);
      setBatch(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBatchData();
  }, [fetchBatchData]);

  const handleBack = () => {
    localStorage.setItem("selectedMenu", "batches");
    navigate("/warehouse");
  };

  const handleEditBatch = () => {
    setOpenEditDialog(true);
  };

  const handleSaveBatch = async (formData) => {
    const payload = {
      ...formData,
      manufactureDate: convertDate(formData.manufactureDate),
      expiryDate: convertDate(formData.expiryDate),
      quantity: parseInt(formData.quantity),
      productId: batch.productId,
    };

    await ProductBatchService.update(id, payload);
    await fetchBatchData();
    setOpenEditDialog(false);
  };

  const handleOpenMovementDialog = (type) => {
    setMovementType(type);
    setOpenMovementDialog(true);
  };

  const handleSubmitMovement = async (formData) => {
    const payload = {
      productBatchId: id,
      quantity: parseInt(formData.quantity),
      createdById: currentUser?.userId,
      idempotencyKey: `${movementType}-${Date.now()}`,
    };

    const actions = {
      receive: () =>
        InventoryService.receive({
          ...payload,
          locationId: formData.locationId,
        }),
      dispatch: () =>
        InventoryService.dispatch({
          ...payload,
          locationId: formData.locationId,
        }),
      transfer: () =>
        InventoryService.transfer({
          ...payload,
          fromLocationId: formData.fromLocationId,
          toLocationId: formData.toLocationId,
        }),
      reserve: () =>
        InventoryService.reserve({
          ...payload,
          locationId: formData.locationId,
        }),
      release: () =>
        InventoryService.release({
          ...payload,
          locationId: formData.locationId,
        }),
    };

    if (actions[movementType]) {
      await actions[movementType]();
      setOpenMovementDialog(false);
      await fetchBatchData();
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="70vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!batch) {
    return (
      <EmptyStateCard
        title="Batch not found"
        description="The batch ID provided does not exist or has been deleted."
        buttonText="Back to Warehouse"
        onButtonClick={handleBack}
      />
    );
  }

  return (
    <Box>
      <DetailHeader
        title={batch.batchNo}
        onBack={handleBack}
        onEdit={handleEditBatch}
        subtitleItems={[
          { label: "Product", value: batch.product?.name },
          { label: "SKU", value: batch.product?.sku },
        ]}
        statItems={[{ label: "Quantity", value: batch.quantity }]}
      />

      <InfoCard
        title="Batch Information"
        subtitle="Tracking details"
        headerColor="#1976d2"
        leftFields={[
          { label: "Batch No", value: batch.batchNo },
          { label: "Quantity", value: batch.quantity },
          { label: "Barcode/QR", value: batch.barcodeOrQr || "-" },
          {
            label: "Manufacture Date",
            value: formatDate(batch.manufactureDate || "-"),
          },
          {
            label: "Expiry Date",
            value: formatDate(batch.expiryDate) || "-",
          },
        ]}
        rightFields={[
          { label: "Product", value: batch.product?.name },
          { label: "SKU", value: batch.product?.sku },
          { label: "Category", value: batch.product?.category?.name },
          { label: "Create Date", value: formatDate(batch.createdAt) },
          { label: "Update Date", value: formatDate(batch.updatedAt) },
        ]}
      />

      <BatchActions onAction={handleOpenMovementDialog} />

      <BatchTabsSection inventory={inventory} movements={movements} />

      {openEditDialog && (
        <FormDialog
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          onAction={handleSaveBatch}
          mode="edit"
          selectedMenu="batches"
          selectedRow={batch}
        />
      )}

      <MovementDialog
        open={openMovementDialog}
        type={movementType}
        locations={locations}
        onClose={() => setOpenMovementDialog(false)}
        onSubmit={handleSubmitMovement}
      />
    </Box>
  );
};

export default BatchDetail;
