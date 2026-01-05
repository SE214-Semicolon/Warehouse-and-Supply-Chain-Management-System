import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  Add as AddIcon,
  AutoGraph as RunIcon,
  WarningAmber as WarningIcon,
  CheckCircle as SuccessIcon,
} from "@mui/icons-material";

import DataTable from "@/components/DataTable";
import SearchBar from "@/components/SearchBar";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import DemandPlanningService from "@/services/demand-planning.service";
import ForecastRunDialog from "./components/ForecastRunDialog";
import ForecastFormDialog from "./components/ForecastFormDialog";
import { getForecastColumns } from "./components/forecastColumns";

const ResultDialog = ({ open, onClose, data }) => {
  const isWarning = data?.type === "warning";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: isWarning ? "#fff4e5" : "#edf7ed",
          color: isWarning ? "#663c00" : "#1e4620",
          fontWeight: "bold",
        }}
      >
        {isWarning ? <WarningIcon color="warning" /> : <SuccessIcon color="success" />}
        {data?.title}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <DialogContentText sx={{ color: "text.primary", whiteSpace: "pre-line" }}>
          {data?.message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant="contained"
          color={isWarning ? "warning" : "primary"}
          sx={{ textTransform: "none" }}
        >
          OK, I understand
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DemandPlanning = () => {
  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [openRunDialog, setOpenRunDialog] = useState(false);
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [resultDialog, setResultDialog] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const res = await DemandPlanningService.getAll();
      setForecasts(Array.isArray(res) ? res : res?.data || []);
    } catch (error) {
      console.error("Failed to fetch forecasts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, []);

  const filteredForecasts = useMemo(() => {
    if (!searchTerm) return forecasts;
    const lowerTerm = searchTerm.toLowerCase();
    return forecasts.filter((item) => {
      const productName = item.product?.name?.toLowerCase() || "";
      const productSku = item.product?.sku?.toLowerCase() || "";
      return productName.includes(lowerTerm) || productSku.includes(lowerTerm);
    });
  }, [forecasts, searchTerm]);

  const handleRunAlgorithm = async (productId, payload) => {
    try {
      const res = await DemandPlanningService.runAlgorithm(productId, payload);
      if (res && res.success) {
        if (res.forecastsCreated === 0) {
          setResultDialog({
            open: true,
            type: "warning",
            title: "Insufficient Data Warning",
            message: `Algorithm ran successfully but NO forecasts were created.\n\nReason: Average Daily Demand is ${res.avgDailyDemand}.\nThis usually happens when the product has no sales history in the selected time window.`,
          });
        } else {
          fetchForecasts();
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveManual = async (data) => {
    if (selectedRow) {
      await DemandPlanningService.update(selectedRow.id, data);
    } else {
      await DemandPlanningService.create(data);
    }
    setOpenFormDialog(false);
    fetchForecasts();
  };

  const handleDelete = async () => {
    if (selectedRow) {
      await DemandPlanningService.delete(selectedRow.id);
      setOpenDeleteDialog(false);
      fetchForecasts();
    }
  };

  const openEdit = (row) => {
    setSelectedRow(row);
    setOpenFormDialog(true);
  };

  const openDelete = (row) => {
    // tên sản phẩm (thuật toán)
    const displayName = row.product
      ? `${row.product.name} (${row.algorithmUsed || "Manual"})`
      : "this forecast";

    setSelectedRow({
      ...row,
      name: displayName,
    });

    setOpenDeleteDialog(true);
  };

  const columns = useMemo(() => getForecastColumns(), []);

  return (
    <Box sx={{ maxWidth: "1200px", mx: "auto", py: 3, px: 2 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          Demand Forecasting
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage predictions and run forecasting algorithms.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: 1, minWidth: "300px" }}>
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search by product name or SKU..."
          />
        </Box>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<RunIcon />}
            onClick={() => setOpenRunDialog(true)}
            sx={{ fontWeight: "bold", whiteSpace: "nowrap", textTransform: "none" }}
          >
            Run Forecast
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedRow(null);
              setOpenFormDialog(true);
            }}
            sx={{ whiteSpace: "nowrap", textTransform: "none" }}
          >
            Add Manual
          </Button>
        </Stack>
      </Box>

      <Box sx={{ position: "relative", minHeight: loading ? 200 : "auto" }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "200px",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <DataTable
            columns={columns}
            data={filteredForecasts}
            onEdit={openEdit}
            onDelete={openDelete}
          />
        )}
      </Box>

      <ForecastRunDialog
        open={openRunDialog}
        onClose={() => setOpenRunDialog(false)}
        onSubmit={handleRunAlgorithm}
      />

      <ForecastFormDialog
        open={openFormDialog}
        initialData={selectedRow}
        onClose={() => setOpenFormDialog(false)}
        onSubmit={handleSaveManual}
      />

      <ConfirmDeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleDelete}
        selectedRow={selectedRow}
      />

      <ResultDialog
        open={resultDialog.open}
        onClose={() => setResultDialog({ ...resultDialog, open: false })}
        data={resultDialog}
      />
    </Box>
  );
};

export default DemandPlanning;
