import { Box, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import DataTable from "@/components/DataTable";
import CardSection from "../CardSection";
import { menuItems } from "../../components/MenuConfig";

const WarehouseLocationsSection = ({
  locations,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
  headerColor = "#3e468a",
}) => {
  const navigate = useNavigate();

  const baseColumns = menuItems.find((m) => m.id === "locations")?.columns || [];
  const columns = baseColumns.filter((col) => col.id !== "warehouseId");

  return (
    <CardSection
      title={`Locations List (${locations.length})`}
      headerColor={headerColor}
      actions={[
        {
          label: "Add Location",
          startIcon: <Add />,
          onClick: onAddLocation,
        },
      ]}
    >
      {locations.length > 0 ? (
        <DataTable
          title=""
          columns={columns}
          data={locations}
          onView={(row) => navigate(`/warehouse/locations/${row.id}`)}
          onEdit={onEditLocation}
          onDelete={onDeleteLocation}
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
  );
};

export default WarehouseLocationsSection;
