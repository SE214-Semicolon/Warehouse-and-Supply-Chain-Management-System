import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Grid,
  Alert,
} from '@mui/material';
import {
  Search,
  AlertCircle,
  Clock,
  Calendar,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { InventoryReportService } from '../../../../services/report.service';
import StatsCard from '../../components/stats-card/StatsCard';
import ReportHeader from '../../components/header/ReportHeader';
import columns from './columns';

export default function ExpiryReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [inventories, setInventories] = useState([]);

  const processedData = useMemo(() => {
    return inventories
      .map((item) => {
        const expiryDate = new Date(item.productBatch.expiryDate);
        const mfgDate = new Date(item.productBatch.manufactureDate);

        const today = new Date();
        const diffTime = expiryDate - today;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const totalLife = expiryDate - mfgDate;
        const elapsed = today - mfgDate;
        const lifeProgress = Math.min(
          Math.max(Math.round((elapsed / totalLife) * 100), 0),
          100
        );

        let status = {
          label: 'Safe',
          color: 'success',
          icon: <CheckCircle2 size={14} />,
          severity: 'safe',
        };
        if (daysRemaining <= 0) {
          status = {
            label: 'Expired',
            color: 'error',
            icon: <ShieldAlert size={14} />,
            severity: 'expired',
          };
        } else if (daysRemaining <= 30) {
          status = {
            label: 'Urgent',
            color: 'error',
            icon: <AlertCircle size={14} />,
            severity: 'urgent',
          };
        } else if (daysRemaining <= 90) {
          status = {
            label: 'Warning (<90d)',
            color: 'warning',
            icon: <Clock size={14} />,
            severity: 'warning',
          };
        }

        return { ...item, daysRemaining, status, lifeProgress };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [inventories]);

  useEffect(() => {
    const getExpiry = async () => {
      const res = await InventoryReportService.getExpiry();
      console.log(res);
      setInventories(res.data.inventories);
    };

    getExpiry();
  }, []);

  const filteredData = processedData.filter(
    (item) =>
      item.productBatch.product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.productBatch.product.sku
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const stats = {
    expired: processedData.filter((i) => i.status.severity === 'expired')
      .length,
    urgent: processedData.filter((i) => i.status.severity === 'urgent').length,
    warning: processedData.filter((i) => i.status.severity === 'warning')
      .length,
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReportHeader
        title="Expiry"
        subtitle="Monitor products nearing their expiration dates"
        icon={Calendar}
        iconBgColor="#dc2626"
        iconColor="#fff"
        showExport={true}
        onExport={() => console.log('Xuất Excel')}
        onRefresh={() => window.location.reload()}
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Expired"
            value={`${stats.expired} SKU`}
            icon={<ShieldAlert size={24} />}
            color="#e11d48"
            bgColor="#fff1f2"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Urgent"
            value={`${stats.urgent}`}
            icon={<AlertCircle size={24} />}
            color="#d97706"
            bgColor="#fef3c7"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Warning"
            value={stats.warning}
            icon={<Clock size={24} />}
            color="#6366f1"
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
          }}
        >
          <TextField
            placeholder="Search by product name or SKU"
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              sx: { borderRadius: 2 },
            }}
          />
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align}
                    sx={{
                      fontWeight: 700,
                      color: '#64748b',
                      width: col.width,
                      maxWidth: col.width,
                    }}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id} hover>
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align}>
                      {col.render(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    align="center"
                    sx={{ py: 8 }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      No data available
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Alert
          sx={{ mt: 3, borderRadius: 3 }}
          severity="info"
          variant="outlined"
        >
          The system is applying the{' '}
          <strong>FEFO (First Expired, First Out)</strong> principle. Please
          prioritize dispatching batches with the shortest remaining shelf life
          to optimize inventory management.
        </Alert>
      </Box>
    </Box>
  );
}
