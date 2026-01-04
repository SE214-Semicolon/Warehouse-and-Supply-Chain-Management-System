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
} from "@mui/material";
import ShipmentService from "@/services/shipment.service";
import { formatDate } from "@/utils/formatDate";

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
      else setError("No shipment found.");
    } catch {
      setError("Shipment not found or server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 5, p: 2 }}>
      <Typography
        variant="h4"
        align="center"
        fontWeight="bold"
        gutterBottom
        color="primary"
      >
        Track Your Shipment
      </Typography>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="Enter Tracking Code"
            placeholder="e.g. GHN-12345"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button
            variant="contained"
            size="large"
            onClick={handleTrack}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Track"}
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="h6">
              Code: <b>{result.trackingCode}</b>
            </Typography>
            <Chip label={result.status} color="primary" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Carrier: {result.carrier} | ETA: {formatDate(result.estimatedDelivery)}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight="bold" mb={2}>
            Timeline
          </Typography>
          <Stack spacing={2}>
            {result.trackingEvents?.map((ev, idx) => (
              <Box key={idx} sx={{ display: "flex", gap: 2 }}>
                <Typography
                  sx={{ minWidth: "130px", fontWeight: "bold", fontSize: "0.9rem" }}
                >
                  {formatDate(ev.eventTime)}
                </Typography>
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    {ev.statusText}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ev.location}
                  </Typography>
                </Box>
              </Box>
            ))}
            {(!result.trackingEvents || result.trackingEvents.length === 0) && (
              <Typography fontStyle="italic">No events recorded.</Typography>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
