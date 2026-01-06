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
import { Search, AlertTriangle, Package, Filter } from 'lucide-react';
import { InventoryReportService } from '../../../../services/report.service';
import StatsCard from '../../components/stats-card/StatsCard';
import ReportHeader from '../../components/header/ReportHeader';
import columns from './columns';

export default function LowStockReport() {
  const [searchTerm, setSearchTerm] = useState('');

  const [inventories, setInventories] = useState([]);

  const processedData = useMemo(() => {
    return inventories.map((item) => {
      const stock = item.availableQty;
      const min = item.productBatch.product.minStockLevel || 5;

      let status = { label: 'Low Stock', color: 'warning', severity: 1 };
      if (stock === 0)
        status = { label: 'Out of Stock', color: 'error', severity: 2 };
      else if (stock > min)
        status = { label: 'Healthy', color: 'success', severity: 0 };

      return { ...item, status, minThreshold: min };
    });
  }, [inventories]);

  useEffect(() => {
    const getLowStock = async () => {
      const res = await InventoryReportService.getLowStock();
      console.log(res);
      setInventories(res.data.inventories);
    };

    getLowStock();
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
    outOfStock: processedData.filter((i) => i.availableQty === 0).length,
    lowStock: processedData.filter(
      (i) => i.availableQty > 0 && i.availableQty <= i.minThreshold
    ).length,
    totalValue: 1250000, // Giả định
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReportHeader
        title="Low Stock Report"
        subtitle={`Updated at: ${new Date().toLocaleString('vi-VN')}`}
        icon={AlertTriangle}
        iconBgColor="#dc2626"
        iconColor="#fff"
        showExport={true}
        onExport={() => console.log('Xuất Excel')}
        onRefresh={() => window.location.reload()}
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Out of Stock"
            value={`${stats.outOfStock} SKU`}
            icon={<AlertTriangle size={24} />}
            color="#dc2626"
            bgColor="#fee2e2"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Low Stock"
            value={`${stats.lowStock} SKU`}
            icon={<Package size={24} />}
            color="#d97706"
            bgColor="#fef3c7"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Total"
            value={processedData.length}
            icon={<Filter size={24} />}
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
                      No records found.
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
          Minimum stock levels (Min Stock) are calculated based on the
          consumption rate over the past 30 days and the estimated replenishment
          lead time.
        </Alert>
      </Box>
    </Box>
  );
}
