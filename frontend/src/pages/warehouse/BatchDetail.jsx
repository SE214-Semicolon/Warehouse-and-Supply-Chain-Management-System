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
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

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
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const [openMovementDialog, setOpenMovementDialog] = useState(false);
  const [movementType, setMovementType] = useState("");
  const [selectedInventory, setSelectedInventory] = useState(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const [user, locRes] = await Promise.all([
          UserService.getCurrentUser(),
          LocationService.getAll(),
        ]);
        setCurrentUser(user);
        setLocations(locRes.data?.data ?? locRes.data ?? []);
      } catch (error) {
        console.error("Init error:", error);
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
        return;
      }

      setBatch(batchData);

      const [invRes, movementRes] = await Promise.all([
        InventoryService.getByBatch(id),
        InventoryService.getMovementByBatch(id),
      ]);

      setInventory(invRes?.inventories || invRes?.data?.inventories || []);
      setMovements(movementRes?.movements || []);
    } catch (error) {
      console.error("Fetch batch error:", error);
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

  const handleEditBatch = () => setOpenEditDialog(true);
  const handleDeleteBatch = () => setOpenDeleteDialog(true);

  const confirmDeleteBatch = async () => {
    await ProductBatchService.delete(id);
    handleBack();
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

  const handleOpenMovement = (type, inventoryRow = null) => {
    setMovementType(type);
    setSelectedInventory(inventoryRow);
    setOpenMovementDialog(true);
  };

  const handleSubmitMovement = async (preparedData) => {
    const commonData = {
      productBatchId: id,
      createdById: currentUser?.userId,
      idempotencyKey: `${movementType}-${Date.now()}`,
    };

    const finalPayload = { ...commonData, ...preparedData };

    const actions = {
      receive: () => InventoryService.receive(finalPayload),
      dispatch: () => InventoryService.dispatch(finalPayload),
      transfer: () => InventoryService.transfer(finalPayload),
      reserve: () => InventoryService.reserve(finalPayload),
      release: () => InventoryService.release(finalPayload),
      adjust: () => InventoryService.adjust(finalPayload),
    };

    if (actions[movementType]) {
      await actions[movementType]();
      setOpenMovementDialog(false);
      setSelectedInventory(null);
      await fetchBatchData();
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
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
        onDelete={handleDeleteBatch}
        disableDelete={inventory && inventory.length > 0}
        subtitleItems={[
          { label: "Product", value: batch.product?.name },
          { label: "SKU", value: batch.product?.sku },
        ]}
        statItems={[{ label: "Total Quantity", value: batch.quantity }]}
      />

      <InfoCard
        title="Batch Information"
        subtitle="Tracking details"
        headerColor="#764ba2"
        leftFields={[
          { label: "Batch No", value: batch.batchNo },
          { label: "Quantity", value: batch.quantity },
          { label: "Barcode/QR", value: batch.barcodeOrQr || "-" },
          { label: "Manufacture Date", value: formatDate(batch.manufactureDate) },
          { label: "Expiry Date", value: formatDate(batch.expiryDate) },
        ]}
        rightFields={[
          { label: "Product", value: batch.product?.name },
          { label: "SKU", value: batch.product?.sku },
          { label: "Category", value: batch.product?.category?.name || "N/A" },
          { label: "Create Date", value: formatDate(batch.createdAt) },
          { label: "Update Date", value: formatDate(batch.updatedAt) },
        ]}
      />

      <BatchActions onAction={(type) => handleOpenMovement(type)} />

      <BatchTabsSection
        inventory={inventory}
        movements={movements}
        onRowAction={(type, row) => handleOpenMovement(type, row)}
      />

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
        selectedInventory={selectedInventory}
        onClose={() => {
          setOpenMovementDialog(false);
          setSelectedInventory(null);
        }}
        onSubmit={handleSubmitMovement}
      />

      <ConfirmDeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={confirmDeleteBatch}
        selectedRow={batch}
      />
    </Box>
  );
};

export default BatchDetail;
