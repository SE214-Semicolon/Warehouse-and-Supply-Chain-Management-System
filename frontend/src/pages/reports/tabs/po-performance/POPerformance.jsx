import { useState, useMemo, useEffect, useCallback } from 'react';
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
  CircularProgress,
  Pagination,
  Chip,
} from '@mui/material';
import {
  Search,
  ShoppingCart,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { DesktopDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { ProcurementReportService } from '../../../../services/report.service';
import { convertDate } from '../../../../utils/convertDate';
import ReportHeader from '../../components/header/ReportHeader';
import StatsCard from '../../components/stats-card/StatsCard';

export default function POPerformanceReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [poData, setPoData] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(dayjs('2025-01-01'));
  const [endDate, setEndDate] = useState(dayjs('2025-12-31'));

  const fetchPOPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ProcurementReportService.getPOPerformance({
        startDate: convertDate(startDate.toDate()),
        endDate: convertDate(endDate.toDate()),
        page,
        limit: 20,
      });
      setPoData(res.data.data || []);
      setSummary(res.data.summary || {});
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      console.error(err);
      setPoData([]);
      setSummary({});
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page]);

  useEffect(() => {
    fetchPOPerformance();
  }, [fetchPOPerformance]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, startDate, endDate]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return poData;
    const lower = searchTerm.toLowerCase();
    return poData.filter(
      (po) =>
        po.poNo?.toLowerCase().includes(lower) ||
        po.supplier?.name?.toLowerCase().includes(lower)
    );
  }, [poData, searchTerm]);

  const stats = useMemo(() => {
    const avgFulfillment = poData.length
      ? (
          poData.reduce((sum, po) => sum + po.fulfillmentRate, 0) /
          poData.length
        ).toFixed(2)
      : 0;

    const totalValue = poData.reduce(
      (sum, po) => sum + parseFloat(po.totalAmount || 0),
      0
    );

    return {
      totalPOs: summary.totalPOs || 0,
      avgFulfillment,
      totalValue,
      avgLeadTime: summary.avgLeadTimeDays || 'N/A',
    };
  }, [poData, summary]);

  const getStatusColor = (status) => {
    if (status === 'draft') return 'default';
    if (status === 'ordered') return 'warning';
    if (status === 'partial') return 'info';
    if (status === 'received') return 'success';
    return 'error';
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReportHeader
          title="Purchase Order Performance"
          subtitle="Track PO fulfillment and supplier delivery metrics"
          icon={ShoppingCart}
          onRefresh={fetchPOPerformance}
          onExport={() => console.log('Export CSV')}
        />

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatsCard
              title="Total POs"
              value={stats.totalPOs.toLocaleString()}
              icon={<ShoppingCart />}
              color="#2563eb"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatsCard
              title="Avg Fulfillment Rate"
              value={`${stats.avgFulfillment}%`}
              icon={<TrendingUp />}
              color="#16a34a"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatsCard
              title="Total Value"
              value={`$${stats.totalValue.toLocaleString()}`}
              icon={<DollarSign />}
              color="#f59e0b"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatsCard
              title="Avg Lead Time"
              value={`${stats.avgLeadTime} days`}
              icon={<Calendar />}
              color="#9333ea"
            />
          </Grid>
        </Grid>

        <Paper
          sx={{
            borderRadius: 4,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: 'none',
          }}
        >
          <Box
            sx={{
              p: 2,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <TextField
              placeholder="Search by PO number or supplier..."
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
            <DesktopDatePicker
              label="From"
              value={startDate}
              onChange={setStartDate}
              slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
            />
            <DesktopDatePicker
              label="To"
              value={endDate}
              onChange={setEndDate}
              slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: '60vh' }}>
                <Table stickyHeader sx={{ minWidth: 1000 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                        PO Number
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                        Supplier
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                        Status
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Total Amount
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Ordered / Received
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Fulfillment Rate
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Lead Time (days)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.map((po) => (
                      <TableRow key={po.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">
                            {po.poNo}
                          </Typography>
                        </TableCell>
                        <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={po.status}
                            color={getStatusColor(po.status)}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          ${parseFloat(po.totalAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          {po.orderedQty} / {po.receivedQty}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            color={
                              po.fulfillmentRate >= 90
                                ? 'success.main'
                                : po.fulfillmentRate >= 50
                                ? 'warning.main'
                                : 'error.main'
                            }
                            fontWeight="700"
                          >
                            {po.fulfillmentRate}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {po.leadTimeDays || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredData.length === 0 && (
                <Box sx={{ p: 10, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    No PO performance data
                  </Typography>
                </Box>
              )}

              {total > 20 && (
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={Math.ceil(total / 20)}
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
    </LocalizationProvider>
  );
}
