import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import DataTable from "@/components/DataTable";
import CardSection from "../CardSection";
import FormDialog from "../FormDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { menuItems } from "../MenuConfig";
import ProductBatchService from "@/services/batch.service";
import { convertDate } from "@/utils/convertDate";

const ProductBatchesSection = ({
  batches = [],
  productId,
  onRefresh,
  headerColor = "#3e468a",
}) => {
  const navigate = useNavigate();

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [selectedRow, setSelectedRow] = useState(null);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const batchColumns = menuItems
    .find((m) => m.id === "batches")
    ?.columns.filter((col) => col.id !== "productId");

  const handleAddClick = () => {
    setDialogMode("add");
    setSelectedRow({ productId: productId });
    setOpenDialog(true);
  };

  const handleEditClick = (row) => {
    setDialogMode("edit");
    setSelectedRow({ ...row, productId: productId });
    setOpenDialog(true);
  };

  const handleFormAction = async (formData) => {
    const payload = {
      ...formData,
      manufactureDate: convertDate(formData.manufactureDate),
      expiryDate: convertDate(formData.expiryDate),
      quantity: parseInt(formData.quantity),
    };

    if (dialogMode === "add") {
      await ProductBatchService.create(payload);
    } else {
      await ProductBatchService.update(selectedRow.id, payload);
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
      await ProductBatchService.delete(selectedRow.id);
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error("Failed to delete batch", error);
    }
    setOpenDeleteDialog(false);
  };

  return (
    <>
      <CardSection
        title={`Batch List (${batches.length})`}
        headerColor={headerColor}
        actions={[
          {
            label: "Add Batch",
            startIcon: <Add />,
            onClick: handleAddClick,
          },
        ]}
      >
        {batches.length > 0 ? (
          <DataTable
            title=""
            columns={batchColumns}
            data={batches}
            onView={(row) => navigate(`/warehouse/batches/${row.id}`)}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        ) : (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary">
              No batches yet
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
              Start adding the first batch for this product
            </Typography>
          </Box>
        )}
      </CardSection>

      <FormDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onAction={handleFormAction}
        mode={dialogMode}
        selectedMenu="batches"
        selectedRow={selectedRow}
        hiddenFields={["productId"]}
      />

      <ConfirmDeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        selectedRow={selectedRow}
      />
    </>
  );
};

export default ProductBatchesSection;
