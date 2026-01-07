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
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
} from "@mui/material";

import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import ShipmentService from "@/services/shipment.service";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { formatDate, formatDateTime } from "@/utils/formatDate";
import FormInput from "@/components/FormInput";
import DialogButtons from "@/components/DialogButtons";
import DataTable from "@/components/DataTable";

import DetailHeader from "./components/DetailHeader";
import InfoCard from "./components/InfoCard";
import EmptyStateCard from "./components/EmptyStateCard";
import { shipmentItemColumns } from "./components/ShipmentConfig";

// Helper màu status
const getStatusColor = (status) => {
  if (!status) return "default";
  switch (status.toLowerCase()) {
    case "delivered":
      return "success";
    case "cancelled":
      return "error";
    case "preparing":
      return "warning";
    case "in_transit":
      return "info";
    default:
      return "default";
  }
};

const TrackingTimeline = ({ events }) => {
  if (!events || events.length === 0)
    return (
      <Box sx={{ p: 2, textAlign: "center", bgcolor: "#f9fafb", borderRadius: 1 }}>
        <Typography color="text.secondary" fontStyle="italic" variant="body2">
          No tracking history available yet.
        </Typography>
      </Box>
    );

  const sorted = [...events].sort(
    (a, b) => new Date(b.eventTime) - new Date(a.eventTime)
  );

  return (
    <Stack spacing={0} sx={{ mt: 1, position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          top: 12,
          bottom: 12,
          left: 19,
          width: 2,
          bgcolor: "#e0e0e0",
          zIndex: 0,
        }}
      />
      {sorted.map((ev, index) => (
        <Box
          key={index}
          sx={{ display: "flex", gap: 2, mb: 3, position: "relative", zIndex: 1 }}
        >
          <Box sx={{ pt: 0.5, flexShrink: 0 }}>
            {" "}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: index === 0 ? "2px solid" : "1px solid #ddd",
                borderColor: index === 0 ? "primary.main" : "transparent",
                color: index === 0 ? "primary.main" : "grey.500",
                bgcolor: "white",
              }}
            >
              <LocalShippingIcon fontSize="small" />
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: "white",
              p: 1.5,
              borderRadius: 2,
              border: "1px solid #eee",
              flex: 1,
              minWidth: 0,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={1}
            >
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                color={index === 0 ? "primary.main" : "text.primary"}
                sx={{ wordBreak: "break-word" }}
              >
                {ev.statusText}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
              >
                {formatDateTime(ev.eventTime)}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, wordBreak: "break-word" }}
            >
              Location: {ev.location}
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
    eventTime: null,
  });
  const [editForm, setEditForm] = useState({
    trackingCode: "",
    carrier: "",
    estimatedDelivery: null,
    notes: "",
  });

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await ShipmentService.getById(id);
      setShipment(res);
    } catch {
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
        ? new Date(shipment.estimatedDelivery)
        : null,
      notes: shipment.notes || "",
    });
    setOpenEditDialog(true);
  };
  const handleOpenAddEvent = () => {
    setEventForm({ location: "", statusText: "", eventTime: new Date() });
    setOpenEventDialog(true);
  };
  const handleSaveEdit = async () => {
    try {
      await ShipmentService.update(id, {
        ...editForm,
        estimatedDelivery: editForm.estimatedDelivery
          ? editForm.estimatedDelivery.toISOString()
          : null,
      });
      setOpenEditDialog(false);
      fetchDetail();
    } catch (e) {
      console.error(e);
    }
  };
  const handleAddEvent = async () => {
    try {
      await ShipmentService.addTrackingEvent(id, {
        ...eventForm,
        eventTime: eventForm.eventTime
          ? eventForm.eventTime.toISOString()
          : new Date().toISOString(),
      });
      setOpenEventDialog(false);
      fetchDetail();
    } catch (e) {
      console.error(e);
    }
  };
  const handleUpdateStatus = async (status) => {
    try {
      await ShipmentService.updateStatus(id, { status });
      fetchDetail();
    } catch (e) {
      console.error(e);
    }
  };
  const handleDelete = async () => {
    try {
      await ShipmentService.delete(id);
      navigate("/shipments");
    } catch (e) {
      console.error(e);
    }
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
        title="Shipment Not Found"
        onButtonClick={() => navigate("/shipments")}
        buttonText="Back to List"
      />
    );

  const customer = shipment.salesOrder?.customer;
  const contact = customer?.contactInfo || {};

  return (
    <Box sx={{ pb: 4, display: "flex", flexDirection: "column", gap: 3 }}>
      <DetailHeader
        title={shipment.shipmentNo}
        onBack={() => navigate("/shipments")}
        onDelete={() => setOpenDeleteDialog(true)}
        onEdit={handleOpenEdit}
        disableDelete={shipment.status !== "preparing" && shipment.status !== "cancelled"}
        subtitleItems={[
          { label: "Tracking Code", value: shipment.trackingCode || "---" },
          { label: "Carrier", value: shipment.carrier || "---" },
        ]}
        statItems={[
          {
            label: "Current Status",
            value: (
              <Chip
                label={shipment.status?.toUpperCase()}
                color={getStatusColor(shipment.status)}
                sx={{ fontWeight: "bold", borderRadius: 1 }}
              />
            ),
          },
        ]}
      />

      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={shipment.status === "cancelled"}
          onClick={handleOpenAddEvent}
        >
          Add Event
        </Button>
        {shipment.status === "preparing" && (
          <Button
            variant="contained"
            startIcon={<LocalShippingIcon />}
            onClick={() => handleUpdateStatus("in_transit")}
          >
            Start Shipping
          </Button>
        )}
        {shipment.status === "in_transit" && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => handleUpdateStatus("delivered")}
          >
            Confirm Delivery
          </Button>
        )}
      </Stack>

      <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", lg: "row" } }}>
        <Box sx={{ flex: 2, display: "flex", flexDirection: "column", gap: 3 }}>
          <InfoCard
            title="General Information"
            headerColor="#1976d2"
            leftFields={[
              { label: "Sales Order", value: shipment.salesOrder?.soNo || "N/A" },
              { label: "Customer", value: customer?.name || "N/A" },
              { label: "Phone/Email", value: contact.phone || contact.email || "-" },
              { label: "Shipping Address", value: customer?.address || "-" },
            ]}
            rightFields={[
              {
                label: "Warehouse",
                value: shipment.warehouse
                  ? `${shipment.warehouse.name} (${shipment.warehouse.code})`
                  : "-",
              },
              { label: "Est. Delivery", value: formatDate(shipment.estimatedDelivery) },
              { label: "Shipped Date", value: formatDate(shipment.shippedAt) },
              { label: "Delivered Date", value: formatDate(shipment.deliveredAt) },
            ]}
          />
          <Paper
            elevation={0}
            sx={{ border: "1px solid #e0e0e0", borderRadius: 2, overflow: "hidden" }}
          >
            <Box
              sx={{
                p: 2,
                bgcolor: "#f9fafb",
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Items in Shipment
              </Typography>
              <Chip label={`${shipment.items?.length || 0} Items`} size="small" />
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
            minWidth: 0,
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
        PaperProps={{ sx: { width: "600px", maxHeight: "90vh" } }}
      >
        <DialogTitle sx={{ bgcolor: "#1976d2", color: "white", fontWeight: 600 }}>
          Edit Shipment Info
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <FormInput
                  label="Tracking Code"
                  value={editForm.trackingCode}
                  onChange={(val) => setEditForm({ ...editForm, trackingCode: val })}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <FormInput
                  label="Carrier"
                  value={editForm.carrier}
                  onChange={(val) => setEditForm({ ...editForm, carrier: val })}
                />
              </Box>
            </Box>
            <FormInput
              type="datetime"
              label="Estimated Delivery"
              value={editForm.estimatedDelivery}
              onChange={(val) => setEditForm({ ...editForm, estimatedDelivery: val })}
            />
            <FormInput
              label="Internal Notes"
              value={editForm.notes}
              onChange={(val) => setEditForm({ ...editForm, notes: val })}
              multiline
              rows={3}
              placeholder="Add notes..."
            />
          </Box>
        </DialogContent>
        <DialogButtons
          onClose={() => setOpenEditDialog(false)}
          onAction={handleSaveEdit}
          labelAction="Save Changes"
          color="#1976d2"
        />
      </Dialog>

      <Dialog
        open={openEventDialog}
        onClose={() => setOpenEventDialog(false)}
        PaperProps={{ sx: { width: "500px", maxHeight: "90vh" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add Tracking Event</DialogTitle>
        <DialogContent sx={{ minWidth: 400, pt: 1 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormInput
              label="Location (City/Hub)"
              autoFocus
              value={eventForm.location}
              onChange={(val) => setEventForm({ ...eventForm, location: val })}
            />
            <FormInput
              label="Status Message"
              placeholder="e.g. Arrived at sorting facility"
              value={eventForm.statusText}
              onChange={(val) => setEventForm({ ...eventForm, statusText: val })}
            />
            <FormInput
              type="datetime"
              label="Event Time"
              value={eventForm.eventTime}
              onChange={(val) => setEventForm({ ...eventForm, eventTime: val })}
            />
          </Stack>
        </DialogContent>
        <DialogButtons
          onClose={() => setOpenEventDialog(false)}
          onAction={handleAddEvent}
          labelAction="Add"
        />
      </Dialog>

      <ConfirmDeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Shipment"
        content={`Are you sure you want to delete shipment ${shipment.shipmentNo}?`}
      />
    </Box>
  );
};

export default ShipmentDetail;
