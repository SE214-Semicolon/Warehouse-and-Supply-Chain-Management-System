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
} from '@mui/material';
import { Search, TrendingUp, Package, BarChart3, Calendar } from 'lucide-react';
import { DesktopDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { ProductReportService } from '../../../../services/report.service';
import { convertDate } from '../../../../utils/convertDate';
import ReportHeader from '../../components/header/ReportHeader';
import StatsCard from '../../components/stats-card/StatsCard';

export default function ProductPerformanceReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [performanceData, setPerformanceData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(dayjs('2025-01-01'));
  const [endDate, setEndDate] = useState(dayjs('2025-12-31'));

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ProductReportService.getPerformance({
        startDate: convertDate(startDate.toDate()),
        endDate: convertDate(endDate.toDate()),
        page,
        limit: 20,
      });
      setPerformanceData(res.data.performanceData || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      setPerformanceData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, startDate, endDate]);

  const sortedData = useMemo(() => {
    return [...performanceData].sort((a, b) => b.turnoverRate - a.turnoverRate);
  }, [performanceData]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return sortedData;
    const lower = searchTerm.toLowerCase();
    return sortedData.filter(
      (item) =>
        item.productName?.toLowerCase().includes(lower) ||
        item.productSku?.toLowerCase().includes(lower) ||
        item.categoryName?.toLowerCase().includes(lower)
    );
  }, [sortedData, searchTerm]);

  const stats = useMemo(() => {
    const avgTurnover = performanceData.length
      ? (
          performanceData.reduce((sum, p) => sum + p.turnoverRate, 0) /
          performanceData.length
        ).toFixed(2)
      : 0;

    const topProduct = performanceData.reduce(
      (max, p) => (p.turnoverRate > (max?.turnoverRate || 0) ? p : max),
      null
    );

    const totalQty = performanceData.reduce(
      (sum, p) => sum + p.totalQuantity,
      0
    );

    return {
      avgTurnover,
      topProduct,
      totalQty,
      uniqueProducts: performanceData.length,
    };
  }, [performanceData]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReportHeader
          title="Product Performance"
          subtitle="Analyze product movement and turnover rates"
          icon={TrendingUp}
          onRefresh={fetchPerformance}
          onExport={() => console.log('Export CSV')}
        />

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatsCard
              title="Avg Turnover Rate"
              value={`${stats.avgTurnover}%`}
              icon={<BarChart3 />}
              color="#2563eb"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatsCard
              title="Top Product"
              value={stats.topProduct?.productName || 'N/A'}
              icon={<TrendingUp />}
              color="#16a34a"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatsCard
              title="Total Quantity Moved"
              value={stats.totalQty.toLocaleString()}
              icon={<Package />}
              color="#f59e0b"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatsCard
              title="Unique Products"
              value={stats.uniqueProducts}
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
              placeholder="Search by product name, SKU or category..."
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
                        Product / SKU
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                        Category
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Total Movements
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Total Quantity
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Turnover Rate (%)
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Frequency
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.productId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">
                            {item.productName || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.productSku || '---'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {item.categoryName || 'Uncategorized'}
                        </TableCell>
                        <TableCell align="right">
                          {item.totalMovements.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          {item.totalQuantity.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="700"
                            color={
                              item.turnoverRate > 50
                                ? 'success.main'
                                : item.turnoverRate > 20
                                ? 'warning.main'
                                : 'error.main'
                            }
                          >
                            {item.turnoverRate.toFixed(2)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {item.movementFrequency.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredData.length === 0 && (
                <Box sx={{ p: 10, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    No product performance data
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
