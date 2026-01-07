import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import {
  Search,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { DemandPlanReportService } from '../../../../services/report.service';
import ReportHeader from '../../components/header/ReportHeader';
import StatsCard from '../../components/stats-card/StatsCard';
import { formatDate } from '../../../../utils/formatDate';

export default function DemandAccuracyReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [accuracyData, setAccuracyData] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchAccuracy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await DemandPlanReportService.getAccuracy({
        page,
        limit: 20,
      });
      setAccuracyData(res.data.accuracyData || []);
      setSummary(res.data.summaryStats || {});
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      setAccuracyData([]);
      setSummary({});
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchAccuracy();
  }, [fetchAccuracy]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return accuracyData;
    const lower = searchTerm.toLowerCase();
    return accuracyData.filter(
      (item) =>
        item.productName?.toLowerCase().includes(lower) ||
        item.productSku?.toLowerCase().includes(lower)
    );
  }, [accuracyData, searchTerm]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReportHeader
        title="Demand Forecast Accuracy"
        subtitle="Evaluate forecast performance against actuals"
        icon={Target}
        onRefresh={fetchAccuracy}
        onExport={() => console.log('Export CSV')}
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatsCard
            title="Avg Accuracy"
            value={`${summary.averageAccuracy?.toFixed(1) || 0}%`}
            icon={<CheckCircle />}
            color="#16a34a"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatsCard
            title="Avg MAE"
            value={summary.averageMAE?.toFixed(0) || 0}
            icon={<TrendingUp />}
            color="#f59e0b"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatsCard
            title="Avg MAPE"
            value={`${summary.averageMAPE?.toFixed(1) || 0}%`}
            icon={<AlertCircle />}
            color="#dc2626"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatsCard
            title="Total Forecasts"
            value={summary.totalForecasts || 0}
            icon={<Target />}
            color="#2563eb"
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
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search by product name or SKU..."
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
            <TableContainer sx={{ maxHeight: '60vh' }}>
              <Table stickyHeader sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      Product / SKU
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      Forecast Date
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Forecasted Qty
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Actual Qty
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Absolute Error
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Accuracy (%)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.forecastId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {item.productName || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.productSku || '---'}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(item.forecastDate)}</TableCell>
                      <TableCell align="right">
                        {item.forecastedQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {item.actualQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {item.absoluteError.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="700"
                          color={
                            item.accuracy >= 90
                              ? 'success.main'
                              : item.accuracy >= 70
                              ? 'warning.main'
                              : 'error.main'
                          }
                        >
                          {item.accuracy.toFixed(1)}%
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
                  No forecast accuracy data
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
  );
}
