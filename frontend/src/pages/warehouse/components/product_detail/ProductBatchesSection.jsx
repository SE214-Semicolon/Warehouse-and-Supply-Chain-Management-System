import { Box, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import DataTable from "@/components/DataTable";
import { menuItems } from "../MenuConfig";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import CardSection from "../CardSection";

const ProductBatchesSection = ({
  batches,
  onAddBatch,
  onEditBatch,
  onDeleteBatch,
  headerColor = "#3e468a",
}) => {
  const navigate = useNavigate();

  const batchColumns = menuItems
    .find((m) => m.id === "batches")
    .columns.filter((col) => col.id !== "productId");

  const actions = useMemo(
    () => [
      {
        label: "Add",
        startIcon: <Add />,
        onClick: onAddBatch,
      },
    ],
    [onAddBatch]
  );

  return (
    <CardSection
      title={`Batch List (${batches.length})`}
      headerColor={headerColor}
      actions={actions}
    >
      {batches.length > 0 ? (
        <DataTable
          title=""
          columns={batchColumns}
          data={batches}
          onView={(row) => navigate(`/warehouse/batches/${row.id}`)}
          onEdit={onEditBatch}
          onDelete={onDeleteBatch}
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
  );
};

export default ProductBatchesSection;
