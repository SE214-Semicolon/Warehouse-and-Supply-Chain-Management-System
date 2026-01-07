import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Chip,
  InputAdornment,
  Container,
} from "@mui/material";
import {
  Search as SearchIcon,
  LocalShipping as LocalShippingIcon,
  Place as PlaceIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";

import ShipmentService from "@/services/shipment.service";
import { formatDateTime } from "@/utils/formatDate";

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

export default function ShipmentTracking() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await ShipmentService.trackByCode(code);
      if (res) setResult(res);
      else setError("No shipment found with this code.");
    } catch {
      setError("Unable to track shipment. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleTrack();
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, pb: 10 }}>
      <Box textAlign="center" mb={3}>
        <Typography variant="h4" fontWeight={800} gutterBottom color="#1a202c">
          Track Your Order
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Enter your tracking ID to see the current status of your shipment.
        </Typography>
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: 1,
          mb: 4,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          border: "1px solid #e0e0e0",
        }}
      >
        <TextField
          fullWidth
          variant="standard"
          placeholder="e.g. SHIP-2026-XYZ"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            disableUnderline: true,
            sx: { px: 2, fontSize: "1.1rem" },
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          size="large"
          onClick={handleTrack}
          disabled={loading || !code.trim()}
          sx={{
            borderRadius: 2,
            px: 4,
            py: 1.5,
            fontWeight: "bold",
            textTransform: "none",
            boxShadow: "none",
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Track"}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} variant="filled">
          {error}
        </Alert>
      )}

      {result && (
        <Paper
          elevation={0}
          sx={{
            p: 0,
            borderRadius: 3,
            border: "1px solid #e0e0e0",
            overflow: "hidden",
            animation: "fadeIn 0.5s ease-in-out",
            "@keyframes fadeIn": {
              "0%": { opacity: 0, transform: "translateY(10px)" },
              "100%": { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Box sx={{ bgcolor: "#f8f9fa", p: 3, borderBottom: "1px solid #e0e0e0" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="overline" color="text.secondary" fontWeight="bold">
                Tracking Number
              </Typography>
              <Chip
                label={result.status?.toUpperCase()}
                color={getStatusColor(result.status)}
                size="small"
                sx={{ fontWeight: "bold", borderRadius: 1, flexShrink: 0 }}
              />
            </Box>

            <Typography
              variant="h5"
              fontWeight={800}
              color="primary.main"
              sx={{ wordBreak: "break-all" }}
            >
              {result.trackingCode}
            </Typography>

            <Stack direction="row" spacing={3} mt={2}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  Carrier
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  noWrap
                  title={result.carrier || "N/A"}
                >
                  {result.carrier || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  Est. Delivery
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatDateTime(result.estimatedDelivery)}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ p: 3 }}>
            <Typography
              variant="h6"
              fontWeight="bold"
              mb={3}
              display="flex"
              alignItems="center"
              gap={1}
            >
              <InventoryIcon color="action" fontSize="small" /> Shipment Activity
            </Typography>

            <Stack spacing={0} sx={{ position: "relative" }}>
              {result.trackingEvents?.length > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 15,
                    bottom: 15,
                    left: 14,
                    width: "2px",
                    bgcolor: "#e0e0e0",
                    zIndex: 0,
                  }}
                />
              )}

              {result.trackingEvents?.map((ev, idx) => (
                <Box
                  key={idx}
                  sx={{ display: "flex", gap: 2, mb: 3, position: "relative", zIndex: 1 }}
                >
                  <Box sx={{ pt: 0.5, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        bgcolor: idx === 0 ? "primary.main" : "white",
                        border: idx === 0 ? "none" : "2px solid #e0e0e0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: idx === 0 ? "white" : "grey.400",
                      }}
                    >
                      <PlaceIcon sx={{ fontSize: 16 }} />
                    </Box>
                  </Box>

                  {/* FIX TRÀN CHỮ Ở ĐÂY */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      fontWeight={idx === 0 ? 700 : 500}
                      color={idx === 0 ? "text.primary" : "text.secondary"}
                      sx={{ wordBreak: "break-word" }}
                    >
                      {ev.statusText}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ wordBreak: "break-word" }}
                    >
                      {ev.location}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: "block", fontStyle: "italic" }}
                    >
                      {formatDateTime(ev.eventTime)}
                    </Typography>
                  </Box>
                </Box>
              ))}

              {(!result.trackingEvents || result.trackingEvents.length === 0) && (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary">
                    No tracking events available.
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Paper>
      )}

      {!result && !loading && !error && (
        <Box textAlign="center" mt={8} color="text.secondary">
          <InventoryIcon sx={{ fontSize: 60, opacity: 0.2, mb: 2 }} />
          <Typography variant="body1">Enter a code above to start tracking.</Typography>
        </Box>
      )}
    </Container>
  );
}
