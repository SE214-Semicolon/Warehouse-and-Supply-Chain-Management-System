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
  Chip,
  TextField,
  InputAdornment,
  Grid,
  IconButton,
  Collapse,
  Stack,
  LinearProgress,
  Tabs,
  Tab,
  Pagination,
  CircularProgress,
  styled,
} from '@mui/material';
import {
  Search,
  Layers,
  ChevronDown,
  ChevronUp,
  BarChart3,
  AlertCircle,
  LayoutGrid,
  MapPin,
} from 'lucide-react';
import { InventoryReportService } from '../../../../services/report.service';
import ReportHeader from '../../components/header/ReportHeader';
import { Warehouse } from 'lucide-react';

const StyledProgress = styled(LinearProgress)(({ value }) => ({
  height: 10,
  borderRadius: 5,
  backgroundColor: '#e2e8f0',
  '& .MuiLinearProgress-bar': {
    borderRadius: 5,
    backgroundColor:
      value > 90 ? '#ef4444' : value > 70 ? '#f59e0b' : '#10b981',
  },
}));

const RowGroup = ({ group, searchTerm }) => {
  const [open, setOpen] = useState(true);

  const groupCapacity = useMemo(() => {
    return group.items.reduce(
      (sum, item) => sum + (item.location?.capacity || 0),
      0
    );
  }, [group.items]);

  const occupancyRate =
    groupCapacity > 0
      ? Math.round((group.totalAvailableQty / groupCapacity) * 100)
      : 0;

  const filteredItems = useMemo(() => {
    if (!searchTerm) return group.items;
    const lower = searchTerm.toLowerCase();
    return group.items.filter(
      (item) =>
        item.productBatch?.product?.name?.toLowerCase().includes(lower) ||
        item.productBatch?.product?.sku?.toLowerCase().includes(lower) ||
        item.productBatch?.batchNo?.toLowerCase().includes(lower)
    );
  }, [group.items, searchTerm]);

  if (searchTerm && filteredItems.length === 0) return null;

  const getStatusColor = (rate) => {
    if (rate > 90) return 'error';
    if (rate > 70) return 'warning';
    return 'success';
  };

  return (
    <>
      <TableRow sx={{ bgcolor: '#fff', '& > *': { borderBottom: 'unset' } }}>
        <TableCell width="40">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </IconButton>
        </TableCell>
        <TableCell width="30%">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                p: 1,
                bgcolor: '#f1f5f9',
                borderRadius: 2,
                color: '#475569',
              }}
            >
              <LayoutGrid size={20} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight="700">
                {group.groupName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Capacity: {groupCapacity.toLocaleString()}
              </Typography>
            </Box>
          </Stack>
        </TableCell>
        <TableCell width="30%">
          <Box sx={{ width: '100%', mr: 1 }}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography
                variant="caption"
                fontWeight="600"
                color="text.secondary"
              >
                Occupancy Rate
              </Typography>
              <Typography
                variant="caption"
                fontWeight="700"
                color={`${getStatusColor(occupancyRate)}.main`}
              >
                {occupancyRate}%
              </Typography>
            </Stack>
            <StyledProgress
              variant="determinate"
              value={Math.min(occupancyRate, 100)}
            />
          </Box>
        </TableCell>
        <TableCell align="right">
          <Typography variant="caption" color="text.secondary">
            Available Qty
          </Typography>
          <Typography variant="subtitle2" fontWeight="700">
            {group.totalAvailableQty.toLocaleString()}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Chip
            label={
              occupancyRate >= 100
                ? 'Full'
                : occupancyRate > 85
                ? 'Nearly Full'
                : 'Available'
            }
            size="small"
            color={getStatusColor(occupancyRate)}
            variant="soft"
            sx={{ fontWeight: 700, borderRadius: 1.5 }}
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, px: 4, pb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>
                      Product / SKU
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>
                      Batch
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>
                      Location
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      Location Rate
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      Stock Qty
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item) => {
                    const itemCapacity = item.location?.capacity || 0;
                    const itemRate =
                      itemCapacity > 0
                        ? Math.round((item.availableQty / itemCapacity) * 100)
                        : 0;

                    return (
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
                          <Typography variant="caption" color="text.secondary">
                            {item.productBatch?.batchNo || '---'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                          >
                            <MapPin size={14} color="#64748b" />
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace' }}
                            >
                              {item.location?.code || '---'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <StyledProgress
                                variant="determinate"
                                value={Math.min(itemRate, 100)}
                                sx={{ height: 6 }}
                              />
                            </Box>
                            <Typography variant="caption" fontWeight="600">
                              {itemRate}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="700">
                            {item.availableQty.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Capacity: {itemCapacity.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={itemRate > 90 ? 'Full' : 'OK'}
                            size="small"
                            variant="outlined"
                            color={getStatusColor(itemRate)}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default function StockLevelReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedData, setGroupedData] = useState([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await InventoryReportService.getStockLevel({
        page,
        limit: 20,
      });
      setGroupedData(res.data.groupedData || []);
      setTotalGroups(res.data.total || 0);
    } catch (err) {
      console.error(err);
      setGroupedData([]);
      setTotalGroups(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const stats = useMemo(() => {
    if (groupedData.length === 0) {
      return {
        totalQty: 0,
        totalCap: 0,
        avgOcc: 0,
        overloadCount: 0,
        availableSpace: 0,
      };
    }

    let totalQty = 0;
    let totalCap = 0;
    let overloadCount = 0;

    groupedData.forEach((group) => {
      const groupCap = group.items.reduce(
        (sum, item) => sum + (item.location?.capacity || 0),
        0
      );
      totalQty += group.totalAvailableQty;
      totalCap += groupCap;

      const rate =
        groupCap > 0 ? (group.totalAvailableQty / groupCap) * 100 : 0;
      if (rate > 90) overloadCount++;
    });

    const avgOcc = totalCap > 0 ? Math.round((totalQty / totalCap) * 100) : 0;
    const availableSpace = totalCap - totalQty;

    return { totalQty, totalCap, avgOcc, overloadCount, availableSpace };
  }, [groupedData]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReportHeader
        title="Stock Level"
        subtitle="Monitor warehouse space utilization and optimize storage"
        icon={Warehouse}
        onRefresh={fetchData}
        onExport={() => console.log('Export CSV')}
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
              height: '100%',
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  fontWeight="600"
                >
                  Overall Occupancy Rate
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: '#eff6ff',
                    color: '#2563eb',
                    borderRadius: 2,
                  }}
                >
                  <BarChart3 size={20} />
                </Box>
              </Stack>
              <Typography variant="h3" fontWeight="900" sx={{ mb: 1 }}>
                {stats.avgOcc}%
              </Typography>
              <StyledProgress
                variant="determinate"
                value={stats.avgOcc}
                sx={{ height: 8 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                Used {stats.totalQty.toLocaleString()} /{' '}
                {stats.totalCap.toLocaleString()} slots
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
              height: '100%',
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  fontWeight="600"
                >
                  Overloaded Locations (>90%)
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: '#fff1f2',
                    color: '#e11d48',
                    borderRadius: 2,
                  }}
                >
                  <AlertCircle size={20} />
                </Box>
              </Stack>
              <Typography variant="h3" fontWeight="900" color="#e11d48">
                {stats.overloadCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Require relocation to avoid congestion
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
              height: '100%',
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  fontWeight="600"
                >
                  Available Capacity
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: '#f0fdf4',
                    color: '#16a34a',
                    borderRadius: 2,
                  }}
                >
                  <Layers size={20} />
                </Box>
              </Stack>
              <Typography variant="h3" fontWeight="900" color="#16a34a">
                {stats.availableSpace.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Room for additional inventory
              </Typography>
            </CardContent>
          </Card>
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
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            pt: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Tabs value={0} sx={{ minHeight: 48 }}>
            <Tab
              label="All Areas"
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
          </Tabs>
          <TextField
            placeholder="Search by product name, SKU or batch..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
              sx: { borderRadius: 2, width: 300, bgcolor: '#f8fafc' },
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
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell />
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      Zone / Rack
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                      Occupancy Status
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Stock Quantity
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: '#64748b' }}
                    >
                      Category
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedData.map((group, index) => (
                    <RowGroup
                      key={group.groupName || index}
                      group={group}
                      searchTerm={searchTerm}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {groupedData.length === 0 && (
              <Box sx={{ p: 10, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No stock level data available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your search or filters
                </Typography>
              </Box>
            )}

            {totalGroups > 20 && (
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  count={Math.ceil(totalGroups / 20)}
                  page={page}
                  onChange={(_e, v) => setPage(v)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>

      <Stack direction="row" spacing={3} sx={{ mt: 3, px: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: '#10b981',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Available (0-70%)
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: '#f59e0b',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Nearly Full (70-90%)
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: '#ef4444',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Overloaded (>90%)
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
