import { useState, useEffect, useMemo } from "react";
import { Box, Typography, Button, Stack, CircularProgress } from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";

import DataTable from "@/components/DataTable";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import AlertService from "@/services/alert.service";
import { getAlertColumns } from "./components/alert-columns/alertColumns";

const Alert = () => {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await AlertService.getAll();
      if (res?.success) {
        const rawAlerts = res.alerts || [];

        const mappedAlerts = rawAlerts.map((alert) => ({
          ...alert,
          statusLabel: alert.isRead ? "Read" : "Unread",
        }));

        setAlerts(mappedAlerts);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkRead = async (row) => {
    try {
      await AlertService.markAsRead(row.id);

      setAlerts((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, isRead: true, statusLabel: "Read" } : item
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteClick = (row) => {
    setSelectedRow({ ...row, name: `this alert` });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedRow) {
      try {
        await AlertService.delete(selectedRow.id);
        setAlerts((prev) => prev.filter((item) => item.id !== selectedRow.id));
        setDeleteDialogOpen(false);
        setSelectedRow(null);
      } catch (error) {
        console.error("Error deleting alert:", error);
      }
    }
  };

  const columns = useMemo(() => getAlertColumns(handleMarkRead), []);

  return (
    <Box sx={{ maxWidth: "1200px", mx: "auto", py: 3, px: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          System Alerts
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchAlerts}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

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
          <DataTable columns={columns} data={alerts} onDelete={handleDeleteClick} />
        )}
      </Box>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        selectedRow={selectedRow}
      />
    </Box>
  );
};

export default Alert;
