import { useState, useEffect, useMemo } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

import DataTable from "@/components/DataTable";
import SearchBar from "@/components/SearchBar";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import ShipmentService from "@/services/shipment.service";
import { shipmentColumns } from "./components/ShipmentConfig";

const Shipment = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const res = await ShipmentService.getAll();
      setData(Array.isArray(res) ? res : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lowerTerm = searchTerm.toLowerCase();
    return data.filter(
      (row) =>
        (row.trackingCode && row.trackingCode.toLowerCase().includes(lowerTerm)) ||
        (row.carrier && row.carrier.toLowerCase().includes(lowerTerm))
    );
  }, [data, searchTerm]);

  const handleDelete = (row) => {
    setSelectedRow(row);
    setOpenDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (selectedRow?.id) {
      await ShipmentService.delete(selectedRow.id);
      fetchShipments();
    }
    setOpenDeleteDialog(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search Tracking Code, Carrier..."
          sx={{ width: 300, bgcolor: "white" }}
        />
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<LocalShippingIcon />}
            onClick={() => navigate("/shipments/track")}
          >
            Track Order
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/shipments/create")}
            sx={{ bgcolor: "#3E468A" }}
          >
            New Shipment
          </Button>
        </Box>
      </Box>

      <Box sx={{ minHeight: "400px" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <DataTable
            columns={shipmentColumns}
            data={filteredData}
            onView={(row) => navigate(`/shipments/${row.id}`)}
            onEdit={(row) => navigate(`/shipments/${row.id}`)}
            onDelete={handleDelete}
          />
        )}
      </Box>

      <ConfirmDeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Shipment"
        content={`Are you sure you want to delete shipment ${selectedRow?.trackingCode}?`}
      />
    </Box>
  );
};

export default Shipment;
