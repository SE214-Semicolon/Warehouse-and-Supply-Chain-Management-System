import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  CircularProgress,
  Button,
  Stack,
  Typography,
  Chip,
  Card,
  CardContent,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Paper,
} from "@mui/material";

import ShipmentService from "@/services/shipment.service";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { formatDate } from "@/utils/formatDate";
// Components UI
import DetailHeader from "./components/DetailHeader";
import InfoCard from "./components/InfoCard";
import EmptyStateCard from "./components/EmptyStateCard";
import DataTable from "@/components/DataTable";
import DialogButtons from "@/components/DialogButtons"; // <--- IMPORT MỚI
import { shipmentItemColumns } from "./components/ShipmentConfig";

// Timeline Component (Giữ nguyên)
const TrackingTimeline = ({ events }) => {
  if (!events || events.length === 0)
    return (
      <Typography color="text.secondary" fontStyle="italic">
        No history yet.
      </Typography>
    );

  const sorted = [...events].sort(
    (a, b) => new Date(b.eventTime) - new Date(a.eventTime)
  );

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {sorted.map((ev, index) => (
        <Box key={index} sx={{ display: "flex", gap: 2 }}>
          <Box sx={{ pt: 0.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: index === 0 ? "primary.main" : "grey.400",
              }}
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {formatDate(ev.eventTime)}
            </Typography>
            <Typography variant="body2" fontWeight={600} color="primary.main">
              {ev.statusText}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {ev.location}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

const ShipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  const [eventForm, setEventForm] = useState({
    location: "",
    statusText: "",
    eventTime: "",
  });
  const [editForm, setEditForm] = useState({
    trackingCode: "",
    carrier: "",
    estimatedDelivery: "",
    notes: "",
  });

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await ShipmentService.getById(id);
      setShipment(res);
    } catch (error) {
      setShipment(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleOpenEdit = () => {
    setEditForm({
      trackingCode: shipment.trackingCode || "",
      carrier: shipment.carrier || "",
      estimatedDelivery: shipment.estimatedDelivery
        ? shipment.estimatedDelivery.slice(0, 16)
        : "",
      notes: shipment.notes || "",
    });
    setOpenEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      await ShipmentService.update(id, {
        ...editForm,
        estimatedDelivery: editForm.estimatedDelivery
          ? new Date(editForm.estimatedDelivery).toISOString()
          : null,
      });
      setOpenEditDialog(false);
      fetchDetail();
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const handleUpdateStatus = async (status) => {
    await ShipmentService.updateStatus(id, { status });
    fetchDetail();
  };

  const handleAddEvent = async () => {
    await ShipmentService.addTrackingEvent(id, {
      ...eventForm,
      eventTime: new Date(eventForm.eventTime).toISOString(),
    });
    setOpenEventDialog(false);
    fetchDetail();
  };

  const handleDelete = async () => {
    await ShipmentService.delete(id);
    navigate("/shipments");
  };

  if (loading)
    return (
      <Box p={5} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  if (!shipment)
    return (
      <EmptyStateCard
        title="Not Found"
        onButtonClick={() => navigate("/shipments")}
        buttonText="Back to List"
      />
    );

  return (
    <Box sx={{ pb: 4, display: "flex", flexDirection: "column", gap: 3 }}>
      <DetailHeader
        title={`Shipment #${shipment.trackingCode}`}
        onBack={() => navigate("/shipments")}
        onDelete={() => setOpenDeleteDialog(true)}
        onEdit={handleOpenEdit}
        disableDelete={shipment.status !== "preparing"}
        subtitleItems={[
          { label: "Carrier", value: shipment.carrier },
          { label: "Created", value: formatDate(shipment.createdAt) },
        ]}
        statItems={[
          {
            label: "Current Status",
            value: (
              <Chip label={shipment.status?.toUpperCase()} color="primary" size="small" />
            ),
          },
        ]}
      />

      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Button
          variant="outlined"
          onClick={() => {
            setEventForm({
              location: "",
              statusText: "",
              eventTime: new Date().toISOString().slice(0, 16),
            });
            setOpenEventDialog(true);
          }}
        >
          + Add Log
        </Button>
        {shipment.status === "preparing" && (
          <Button variant="contained" onClick={() => handleUpdateStatus("in_transit")}>
            Start Shipping
          </Button>
        )}
        {shipment.status === "in_transit" && (
          <Button
            variant="contained"
            color="success"
            onClick={() => handleUpdateStatus("delivered")}
          >
            Confirm Delivery
          </Button>
        )}
      </Stack>

      <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", lg: "row" } }}>
        <Box sx={{ flex: 2, display: "flex", flexDirection: "column", gap: 3 }}>
          <InfoCard
            title="Shipment Details"
            headerColor="#1976d2"
            leftFields={[
              { label: "Tracking Code", value: shipment.trackingCode },
              { label: "Warehouse ID", value: shipment.warehouseId },
              { label: "Sales Order", value: shipment.salesOrderReference || "-" },
            ]}
            rightFields={[
              { label: "Est. Delivery", value: formatDate(shipment.estimatedDelivery) },
              { label: "Notes", value: shipment.notes || "-" },
            ]}
          />

          <Paper
            elevation={0}
            sx={{ border: "1px solid #e0e0e0", borderRadius: 2, overflow: "hidden" }}
          >
            <Box sx={{ p: 2, bgcolor: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
              <Typography variant="h6" fontWeight="bold">
                Items List
              </Typography>
            </Box>
            <DataTable columns={shipmentItemColumns} data={shipment.items || []} />
          </Paper>
        </Box>

        <Card
          sx={{
            flex: 1,
            height: "fit-content",
            border: "1px solid #e0e0e0",
            boxShadow: "none",
          }}
        >
          <CardContent>
            <Typography variant="h6" mb={2} fontWeight="bold">
              Tracking History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TrackingTimeline events={shipment.trackingEvents || []} />
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#1976d2" }}>
          Edit Shipment Info
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Tracking Code"
                fullWidth
                value={editForm.trackingCode}
                onChange={(e) =>
                  setEditForm({ ...editForm, trackingCode: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Carrier"
                fullWidth
                value={editForm.carrier}
                onChange={(e) => setEditForm({ ...editForm, carrier: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Estimated Delivery"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={editForm.estimatedDelivery}
                onChange={(e) =>
                  setEditForm({ ...editForm, estimatedDelivery: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                multiline
                rows={3}
                fullWidth
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogButtons
          onClose={() => setOpenEditDialog(false)}
          onAction={handleSaveEdit}
          labelAction="Save Changes"
          color="#1976d2"
        />
      </Dialog>

      <Dialog open={openEventDialog} onClose={() => setOpenEventDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Tracking Event</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 400, pt: 1 }}
        >
          <TextField
            label="Location"
            fullWidth
            value={eventForm.location}
            onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
          />
          <TextField
            label="Status (Message)"
            fullWidth
            value={eventForm.statusText}
            onChange={(e) => setEventForm({ ...eventForm, statusText: e.target.value })}
          />
          <TextField
            type="datetime-local"
            label="Time"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={eventForm.eventTime}
            onChange={(e) => setEventForm({ ...eventForm, eventTime: e.target.value })}
          />
        </DialogContent>
        <DialogButtons
          onClose={() => setOpenEventDialog(false)}
          onAction={handleAddEvent}
          labelAction="Add Log"
        />
      </Dialog>

      <ConfirmDeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Shipment"
      />
    </Box>
  );
};

export default ShipmentDetail;
