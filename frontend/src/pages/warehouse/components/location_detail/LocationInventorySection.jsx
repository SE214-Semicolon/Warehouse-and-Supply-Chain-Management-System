import { Box, Typography, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DataTable from "@/components/DataTable";
import CardSection from "../CardSection";
import { formatDate } from "@/utils/formatDate";

const LocationInventorySection = ({ inventory, headerColor = "#764ba2" }) => {
  const navigate = useNavigate();

  const columns = [
    {
      id: "productInfo",
      label: "Product",
      align: "left",
      minWidth: 280,
      valueGetter: (row) => row.productBatch?.product?.name || "",
      render: (value, row) => {
        const item = row || value;
        const product = item?.productBatch?.product;

        return (
          <Box py={1}>
            {" "}
            <Typography variant="subtitle1" fontWeight={600} lineHeight={1.2}>
              {product?.name || "Unknown"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {product?.category?.name}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: "sku",
      label: "SKU",
      align: "center",
      minWidth: 120,
      valueGetter: (row) => row.productBatch?.product?.sku || "",
      render: (value, row) => {
        const item = row || value;
        return (
          <Typography variant="body1">{item?.productBatch?.product?.sku}</Typography>
        );
      },
    },
    {
      id: "batchNo",
      label: "Batch No",
      align: "center",
      minWidth: 140,
      valueGetter: (row) => row.productBatch?.batchNo || "",
      render: (value, row) => {
        const item = row || value;
        return (
          <Chip
            label={item?.productBatch?.batchNo}
            size="medium"
            variant="outlined"
            color="primary"
            sx={{ fontWeight: 500, fontSize: "13px" }}
          />
        );
      },
    },
    {
      id: "expiryDate",
      label: "Expiry Date",
      align: "center",
      filterable: false,
      minWidth: 100,
      render: (value, row) => {
        const item = row || value;
        return (
          <Typography variant="body2">
            {formatDate(item?.productBatch?.expiryDate)}
          </Typography>
        );
      },
    },
    {
      id: "availableQty",
      label: "Available",
      align: "center",
      minWidth: 100,
      render: (value, row) => {
        const item = row || value;
        return (
          <Box display="flex" justifyContent="center">
            <Typography fontWeight={600} color="success.main">
              {item?.availableQty?.toLocaleString("vi-VN")}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: "reservedQty",
      label: "Reserved",
      align: "center",
      minWidth: 100,
      render: (value, row) => {
        const item = row || value;
        return item?.reservedQty > 0 ? (
          <Box display="flex" justifyContent="center">
            <Typography fontWeight={600} color="warning.main">
              {item.reservedQty?.toLocaleString("vi-VN")}
            </Typography>
          </Box>
        ) : (
          <Typography color="text.disabled" align="center">
            -
          </Typography>
        );
      },
    },
  ];

  return (
    <CardSection
      title={`Current Inventory (${inventory.length})`}
      headerColor={headerColor}
      actions={[]}
    >
      {inventory.length > 0 ? (
        <DataTable
          title=""
          columns={columns}
          data={inventory}
          onView={(row) => navigate(`/warehouse/batches/${row.productBatchId}`)}
          onEdit={null}
          onDelete={null}
        />
      ) : (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">
            No items in this location
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This location is currently empty.
          </Typography>
        </Box>
      )}
    </CardSection>
  );
};

export default LocationInventorySection;
