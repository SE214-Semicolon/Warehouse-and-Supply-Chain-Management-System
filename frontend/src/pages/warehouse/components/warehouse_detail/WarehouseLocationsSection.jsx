import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import DataTable from "@/components/DataTable";
import CardSection from "../CardSection";
import FormDialog from "../FormDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { menuItems } from "../../components/MenuConfig";
import LocationService from "@/services/location.service";

const WarehouseLocationsSection = ({
  locations = [],
  warehouseId,
  onRefresh,
  headerColor = "#3e468a",
}) => {
  const navigate = useNavigate();

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [selectedRow, setSelectedRow] = useState(null);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const baseColumns = menuItems.find((m) => m.id === "locations")?.columns || [];
  const columns = baseColumns.filter((col) => col.id !== "warehouseId");

  const handleAddClick = () => {
    setDialogMode("add");
    setSelectedRow({ warehouseId: warehouseId });
    setOpenDialog(true);
  };

  const handleEditClick = (row) => {
    setDialogMode("edit");
    setSelectedRow({ ...row, warehouseId: warehouseId });
    setOpenDialog(true);
  };

  const handleFormAction = async (formData) => {
    const payload = { ...formData };

    if (dialogMode === "add") {
      await LocationService.create(payload);
    } else {
      await LocationService.update(selectedRow.id, payload);
    }

    if (onRefresh) await onRefresh();
  };

  const handleDeleteClick = (row) => {
    setSelectedRow(row);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRow?.id) return;
    try {
      await LocationService.delete(selectedRow.id);
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error("Failed to delete location", error);
    }
    setOpenDeleteDialog(false);
  };

  return (
    <>
      <CardSection
        title={`Locations List (${locations.length})`}
        headerColor={headerColor}
        actions={[
          {
            label: "Add Location",
            startIcon: <Add />,
            onClick: handleAddClick,
          },
        ]}
      >
        {locations.length > 0 ? (
          <DataTable
            title=""
            columns={columns}
            data={locations}
            onView={(row) => navigate(`/warehouse/locations/${row.id}`)}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        ) : (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary">
              No locations defined
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
              Start adding racks, shelves, or zones to this warehouse.
            </Typography>
          </Box>
        )}
      </CardSection>

      <FormDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onAction={handleFormAction}
        mode={dialogMode}
        selectedMenu="locations"
        selectedRow={selectedRow}
        hiddenFields={["warehouseId"]}
      />

      <ConfirmDeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Location"
        content={`Are you sure you want to delete location "${selectedRow?.code || ""}"?`}
      />
    </>
  );
};

export default WarehouseLocationsSection;
