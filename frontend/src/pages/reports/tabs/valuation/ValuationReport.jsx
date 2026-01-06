import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
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
  CircularProgress,
  Pagination,
  Stack,
  Chip,
} from '@mui/material';
import {
  Search,
  DollarSign,
  Package,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { InventoryReportService } from '../../../../services/report.service';
import ReportHeader from '../../components/header/ReportHeader';
import StatsCard from '../../components/stats-card/StatsCard';

export default function ValuationReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [valuationData, setValuationData] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchValuation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await InventoryReportService.getValuation({
        page,
        limit: 20,
      });
      setValuationData(res.data.valuationData || []);
      setGrandTotal(res.data.grandTotal || 0);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      console.error(err);
      setValuationData([]);
      setGrandTotal(0);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchValuation();
  }, [fetchValuation]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return valuationData;
    const lower = searchTerm.toLowerCase();
    return valuationData.filter((item) => {
      const name = item.productBatch?.product?.name || '';
      const sku = item.productBatch?.product?.sku || '';
      const batch = item.productBatch?.batchNo || '';
      return (
        name.toLowerCase().includes(lower) ||
        sku.toLowerCase().includes(lower) ||
        batch.toLowerCase().includes(lower)
      );
    });
  }, [valuationData, searchTerm]);

  // Stats giống MovementReport
  const stats = useMemo(() => {
    const uniqueProducts = new Set(
      valuationData
        .map((item) => item.productBatch?.product?.id)
        .filter(Boolean)
    ).size;

    const totalQty = valuationData.reduce(
      (sum, item) => sum + item.availableQty,
      0
    );

    const method = valuationData[0]?.method || 'AVERAGE';

    return {
      grandTotal,
      totalQty,
      uniqueProducts,
      method,
    };
  }, [valuationData, grandTotal]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReportHeader
        title="Inventory Valuation"
        subtitle="Current stock value based on selected valuation method"
        icon={DollarSign}
        onRefresh={fetchValuation}
        onExport={() => console.log('Export CSV')}
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Total Value"
            value={stats.grandTotal.toLocaleString()}
            icon={<DollarSign size={24} />}
            color="#10b981"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Total Quantity"
            value={stats.totalQty.toLocaleString()}
            icon={<Package size={24} />}
            color="#d97706"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Unique Products"
            value={stats.uniqueProducts.toString().padStart(2, '0')}
            icon={<TrendingUp size={24} />}
            color="#6366f1"
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          boxShadow: 'none',
        }}
      >
        {/* Search bar giống LowStockReport */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
          }}
        >
          <TextField
            placeholder="Search by product, SKU or batch..."
            size="small"
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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      Product / SKU
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      Batch
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      Location
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Available Qty
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Unit Value
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Total Value
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {item.productBatch?.product?.name ||
                            'Unknown Product'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.productBatch?.product?.sku || '---'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.productBatch?.batchNo || '---'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {item.location?.code || '---'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.location?.name || ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="700">
                          {item.availableQty.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.productBatch?.product?.unit || ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${item.unitValue?.toLocaleString() || '0'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="700"
                          color="primary.main"
                        >
                          ${item.totalValue?.toLocaleString() || '0'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                        <Typography variant="h6" color="text.secondary">
                          No valuation data available
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Try adjusting your search term
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {totalItems > 20 && (
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  count={Math.ceil(totalItems / 20)}
                  page={page}
                  onChange={(_e, v) => setPage(v)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}
