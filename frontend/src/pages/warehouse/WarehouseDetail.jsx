import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import WarehouseService from "@/services/warehouse.service";
import { formatDate } from "@/utils/formatDate";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

import FormDialog from "./components/FormDialog";
import DetailHeader from "./components/DetailHeader";
import InfoCard from "./components/InfoCard";
import EmptyStateCard from "./components/EmptyStateCard";
import WarehouseLocationsSection from "./components/warehouse_detail/WarehouseLocationsSection";

const WarehouseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [warehouse, setWarehouse] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteWarehouseDialog, setOpenDeleteWarehouseDialog] = useState(false);

  const fetchWarehouseDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await WarehouseService.getById(id);
      if (res?.data) {
        setWarehouse(res.data);
        setStats(res.stats || {});
      } else {
        setWarehouse(null);
      }
    } catch (error) {
      console.error("Fetch warehouse error:", error);
      setWarehouse(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWarehouseDetail();
  }, [fetchWarehouseDetail]);

  const handleBack = () => {
    localStorage.setItem("selectedMenu", "warehouses");
    navigate("/warehouse");
  };

  const handleEditWarehouse = () => setOpenEditDialog(true);

  const handleSaveWarehouse = async (formData) => {
    await WarehouseService.update(id, formData);
    await fetchWarehouseDetail();
    setOpenEditDialog(false);
  };

  const handleDeleteWarehouse = () => setOpenDeleteWarehouseDialog(true);

  const confirmDeleteWarehouse = async () => {
    if (!id) return;
    await WarehouseService.delete(id);
    handleBack();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!warehouse) {
    return (
      <EmptyStateCard
        title="Warehouse not found"
        description="The warehouse ID provided does not exist."
        buttonText="Back to List"
        onButtonClick={handleBack}
      />
    );
  }

  const hasLocations = warehouse.locations && warehouse.locations.length > 0;

  return (
    <Box>
      <DetailHeader
        title={warehouse.name}
        onBack={handleBack}
        onEdit={handleEditWarehouse}
        onDelete={handleDeleteWarehouse}
        disableDelete={hasLocations}
        subtitleItems={[
          { label: "Code", value: warehouse.code },
          { label: "Address", value: warehouse.address },
        ]}
        statItems={[
          { label: "Locations", value: stats?.totalLocations || 0 },
          { label: "Occupied", value: stats?.occupiedLocations || 0 },
          { label: "Total Capacity", value: stats?.totalCapacity || 0 },
        ]}
      />

      <InfoCard
        title="Warehouse Information"
        subtitle="General details & metadata"
        headerColor="#764ba2"
        leftFields={[
          { label: "Name", value: warehouse.name },
          { label: "Code", value: warehouse.code },
          { label: "Address", value: warehouse.address },
        ]}
        rightFields={[
          { label: "Total Area", value: warehouse.metadata?.totalArea || "-" },
          { label: "Created Date", value: formatDate(warehouse.createdAt) },
          { label: "Updated Date", value: formatDate(warehouse.updatedAt) },
        ]}
      />

      <WarehouseLocationsSection
        locations={warehouse.locations || []}
        warehouseId={id}
        onRefresh={fetchWarehouseDetail}
        headerColor="#3e468a"
      />

      <FormDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        onAction={handleSaveWarehouse}
        mode="edit"
        selectedMenu="warehouses"
        selectedRow={warehouse}
      />

      <ConfirmDeleteDialog
        open={openDeleteWarehouseDialog}
        onClose={() => setOpenDeleteWarehouseDialog(false)}
        onConfirm={confirmDeleteWarehouse}
        title="Delete Warehouse"
        content={`Are you sure you want to delete warehouse "${warehouse.name}"?`}
      />
    </Box>
  );
};

export default WarehouseDetail;
