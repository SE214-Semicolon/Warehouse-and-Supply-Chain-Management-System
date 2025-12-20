import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import LocationService from "@/services/location.service";

import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { formatDate } from "@/utils/formatDate";

import FormDialog from "./components/FormDialog";
import DetailHeader from "./components/DetailHeader";
import InfoCard from "./components/InfoCard";
import EmptyStateCard from "./components/EmptyStateCard";
import LocationInventorySection from "./components/location_detail/LocationInventorySection";

const LocationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [location, setLocation] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const fetchLocationDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await LocationService.getById(id);
      if (res?.data) {
        setLocation(res.data);
        setStats(res.stats || {});
      } else {
        setLocation(null);
      }
    } catch (error) {
      console.error("Fetch location error:", error);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLocationDetail();
  }, [fetchLocationDetail]);

  const handleBack = () => {
    localStorage.setItem("selectedMenu", "locations");
    navigate("/warehouse");
  };

  const handleEditLocation = () => setOpenEditDialog(true);
  const handleDeleteLocation = () => setOpenDeleteDialog(true);

  const handleSaveLocation = async (formData) => {
    await LocationService.update(id, formData);
    await fetchLocationDetail();
    setOpenEditDialog(false);
  };

  const confirmDeleteLocation = async () => {
    if (!id) return;
    await LocationService.delete(id);
    handleBack();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!location) {
    return (
      <EmptyStateCard
        title="Location not found"
        description="The location ID provided does not exist."
        buttonText="Back to List"
        onButtonClick={handleBack}
      />
    );
  }

  const hasInventory =
    stats?.totalQuantity > 0 || (location.inventory && location.inventory.length > 0);

  return (
    <Box>
      <DetailHeader
        title={location.name}
        onBack={handleBack}
        onEdit={handleEditLocation}
        onDelete={handleDeleteLocation}
        disableDelete={hasInventory}
        subtitleItems={[
          { label: "Code", value: location.code },
          { label: "Warehouse", value: location.warehouse?.name || "-" },
        ]}
        statItems={[
          { label: "Capacity", value: location.capacity },
          { label: "Current Quantity", value: stats?.totalQuantity || 0 },
          { label: "Utilization", value: `${stats?.utilizationRate || 0}%` },
        ]}
      />

      <InfoCard
        title="Location Information"
        subtitle="Detailed specifications"
        headerColor="#764ba2"
        leftFields={[
          { label: "Name", value: location.name },
          { label: "Code", value: location.code },
          { label: "Type", value: location.type },
          { label: "Warehouse", value: location.warehouse?.name },
        ]}
        rightFields={[
          { label: "Capacity", value: location.capacity },
          { label: "Total Items", value: stats?.totalInventoryItems || 0 },
          { label: "Created At", value: formatDate(location.createdAt) },
          { label: "Updated At", value: formatDate(location.updatedAt) },
        ]}
      />

      <LocationInventorySection
        inventory={location.inventory || []}
        headerColor="#3e468a"
      />

      {openEditDialog && (
        <FormDialog
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          onAction={handleSaveLocation}
          mode="edit"
          selectedMenu="locations"
          selectedRow={location}
        />
      )}

      <ConfirmDeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={confirmDeleteLocation}
        title="Delete Location"
        content={`Are you sure you want to delete location "${location.name}"?`}
      />
    </Box>
  );
};

export default LocationDetail;
