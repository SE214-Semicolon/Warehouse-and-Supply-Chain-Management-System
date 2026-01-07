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
import { Search, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { DesktopDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { ProcurementReportService } from '../../../../services/report.service';
import { convertDate } from '../../../../utils/convertDate';
import ReportHeader from '../../components/header/ReportHeader';
import StatsCard from '../../components/stats-card/StatsCard';

export default function SupplierPerformanceReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierData, setSupplierData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(dayjs('2025-01-01'));
  const [endDate, setEndDate] = useState(dayjs('2025-12-31'));

  const fetchSupplierPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ProcurementReportService.getSupplierPerformance({
        startDate: convertDate(startDate.toDate()),
        endDate: convertDate(endDate.toDate()),
        page,
        limit: 20,
      });
      setSupplierData(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      console.error(err);
      setSupplierData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page]);

  useEffect(() => {
    fetchSupplierPerformance();
  }, [fetchSupplierPerformance]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, startDate, endDate]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return supplierData;
    const lower = searchTerm.toLowerCase();
    return supplierData.filter(
      (sup) =>
        sup.name?.toLowerCase().includes(lower) ||
        sup.contactInfo?.contactPerson?.toLowerCase().includes(lower)
    );
  }, [supplierData, searchTerm]);

  const stats = useMemo(() => {
    const avgFulfillment = supplierData.length
      ? (
          supplierData.reduce((sum, sup) => sum + sup.fulfillmentRate, 0) /
          supplierData.length
        ).toFixed(2)
      : 0;

    const totalValue = supplierData.reduce(
      (sum, sup) => sum + sup.totalValue,
      0
    );

    return {
      totalSuppliers: supplierData.length,
      avgFulfillment,
      totalValue,
      avgLeadTime:
        supplierData
          .reduce(
            (sum, sup, _, arr) => sum + (sup.avgLeadTimeDays || 0) / arr.length,
            0
          )
          .toFixed(2) || 'N/A',
    };
  }, [supplierData]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReportHeader
          title="Supplier Performance"
          subtitle="Evaluate supplier reliability and delivery metrics"
          icon={Users}
          onRefresh={fetchSupplierPerformance}
          onExport={() => console.log('Export CSV')}
        />

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <StatsCard
              title="Total Suppliers"
              value={stats.totalSuppliers.toLocaleString()}
              icon={<Users />}
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
              placeholder="Search by supplier name or contact..."
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
                        Supplier Name
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                        Contact
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Total Orders
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Total Value
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Avg Order Value
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Avg Lead Time
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        On-Time Delivery (%)
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: '#64748b' }}
                      >
                        Fulfillment Rate (%)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.map((sup) => (
                      <TableRow key={sup.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">
                            {sup.name || 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {sup.contactInfo?.contactPerson || 'N/A'} (
                            {sup.contactInfo?.phone || 'N/A'})
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{sup.totalOrders}</TableCell>
                        <TableCell align="right">
                          ${sup.totalValue.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          ${sup.avgOrderValue.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          {sup.avgLeadTimeDays || 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          {sup.onTimeDeliveryRate
                            ? `${sup.onTimeDeliveryRate}%`
                            : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            color={
                              sup.fulfillmentRate >= 90
                                ? 'success.main'
                                : sup.fulfillmentRate >= 50
                                ? 'warning.main'
                                : 'error.main'
                            }
                            fontWeight="700"
                          >
                            {sup.fulfillmentRate}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredData.length === 0 && (
                <Box sx={{ p: 10, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    No supplier performance data
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
