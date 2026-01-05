import React, { useState, useMemo, useEffect } from 'react';
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
  Button,
  TextField,
  InputAdornment,
  Grid,
  IconButton,
  Collapse,
  Tooltip,
  Stack,
  LinearProgress,
  Tab,
  Tabs,
  styled,
} from '@mui/material';
import {
  Search,
  Download,
  Layers,
  Box as BoxIcon,
  ChevronDown,
  ChevronUp,
  Map,
  Filter,
  BarChart3,
  Archive,
  AlertCircle,
  TrendingUp,
  LayoutGrid,
  MapPin,
} from 'lucide-react';
import { InventoryReportService } from '../../../../services/report.service';

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

const apiResponse = {
  success: true,
  groupedData: [
    {
      groupName: 'Aisle A, Rack 01, Level 01',
      totalAvailableQty: 10722,
      capacity: 15000,
      totalValue: 150000000,
      items: [
        {
          id: 'item-1',
          availableQty: 97,
          productBatch: {
            batchNo: 'BATCH-2024-001',
            expiryDate: '2025-12-26T17:00:00.000Z',
            product: {
              sku: 'SKU-PRO-01',
              name: 'Màn hình Dell UltraSharp',
              unit: 'pcs',
            },
          },
          location: { code: 'A-01-01', capacity: 500 },
        },
        {
          id: 'item-2',
          availableQty: 10189,
          productBatch: {
            batchNo: '1234567890123',
            expiryDate: '2025-12-25T17:00:00.000Z',
            product: {
              sku: 'SKU-00123',
              name: 'Laptop Dell XPS 15',
              unit: 'pcs',
            },
          },
          location: { code: 'A-01-02', capacity: 12000 },
        },
      ],
    },
    {
      groupName: 'Aisle B, Rack 05, Level 02',
      totalAvailableQty: 4800,
      capacity: 5000,
      totalValue: 85000000,
      items: [
        {
          id: 'item-3',
          availableQty: 4800,
          productBatch: {
            batchNo: 'BATCH-999',
            product: { sku: 'FIN-2025', name: 'Bàn phím cơ Logi', unit: 'pcs' },
          },
          location: { code: 'B-05-01', capacity: 5000 },
        },
      ],
    },
    {
      groupName: 'Dãy C - Khu vực thực phẩm',
      totalAvailableQty: 150,
      capacity: 2000,
      totalValue: 12000000,
      items: [
        {
          id: 'item-4',
          availableQty: 150,
          productBatch: {
            batchNo: 'F-2024',
            product: { sku: 'FOOD-01', name: 'Sữa bột Vinamilk', unit: 'lon' },
          },
          location: { code: 'C-01-01', capacity: 2000 },
        },
      ],
    },
  ],
  total: 3,
};

const RowGroup = ({ group, searchTerm }) => {
  const [open, setOpen] = useState(true);
  const occupancyRate = Math.round(
    (group.totalAvailableQty / group.capacity) * 100
  );

  const filteredItems = group.items.filter(
    (item) =>
      item.productBatch.product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.productBatch.product.sku
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

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
                Sức chứa: {group.capacity.toLocaleString()}
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
                Tỉ lệ lấp đầy
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
            Hiện có
          </Typography>
          <Typography variant="subtitle2" fontWeight="700">
            {group.totalAvailableQty.toLocaleString()}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Chip
            label={
              occupancyRate >= 100
                ? 'Hết chỗ'
                : occupancyRate > 85
                ? 'Sắp đầy'
                : 'Còn trống'
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
                      SKU / Sản phẩm
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>
                      Vị trí
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      Tỉ lệ vị trí
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      Số lượng tồn
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      Trạng thái
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item) => {
                    const itemRate = Math.round(
                      (item.availableQty / item.location.capacity) * 100
                    );
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">
                            {item.productBatch.product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.productBatch.product.sku}
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
                              {item.location.code}
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
                                value={itemRate}
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
                            Sức chứa: {item.location.capacity}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={itemRate > 90 ? 'Đầy' : 'OK'}
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
  const [activeAisle, setActiveAisle] = useState(0);
  const [groupedData, setGroupedData] = useState([]);

  const stats = useMemo(() => {
    const totalQty = apiResponse.groupedData.reduce(
      (acc, curr) => acc + curr.totalAvailableQty,
      0
    );
    const totalCap = groupedData.reduce((acc, curr) => acc + curr.capacity, 0);
    const avgOcc = Math.round((totalQty / totalCap) * 100);
    return { totalQty, totalCap, avgOcc };
  }, []);

  useEffect(() => {
    const getStockLevel = async () => {
      const res = await InventoryReportService.getStockLevel();
      console.log(res);
      setGroupedData(res.data.groupedData);
    };

    getStockLevel();
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TrendingUp size={28} color="#2563eb" />
            <Typography variant="h4" fontWeight="900" color="#1e293b">
              Quản lý không gian kho
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Theo dõi tỉ lệ lấp đầy và tối ưu hóa vị trí lưu trữ hàng hóa
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Download size={18} />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Xuất file
          </Button>
          <Button
            variant="contained"
            startIcon={<Map size={18} />}
            sx={{ borderRadius: 2, bgcolor: '#2563eb', px: 3 }}
          >
            Sơ đồ kho 2D
          </Button>
        </Box>
      </Box>

      {/* Top Stats - Focused on Space */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
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
                  Tổng tỉ lệ lấp đầy
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
                Đã sử dụng {stats.totalQty.toLocaleString()} /{' '}
                {stats.totalCap.toLocaleString()} vị trí
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
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
                  Vị trí quá tải ({'>'}90%)
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
                02
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cần luân chuyển hàng hóa sớm để tránh tắc nghẽn
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              border: '1px solid #e2e8f0',
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
                  Sức chứa khả dụng
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
                {(stats.totalCap - stats.totalQty).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Có thể nhập thêm khoảng 15 container hàng
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Interactive Table Area */}
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
          <Tabs
            value={activeAisle}
            onChange={(e, v) => setActiveAisle(v)}
            sx={{ minHeight: 48 }}
          >
            <Tab
              label="Tất cả khu vực"
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
            <Tab
              label="Dãy A"
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
            <Tab
              label="Dãy B"
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
            <Tab
              label="Khu thực phẩm"
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
          </Tabs>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              placeholder="Tìm SKU hoặc tên hàng..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, width: 250, bgcolor: '#f8fafc' },
              }}
            />
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell />
                <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                  Khu vực / Dãy kệ
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>
                  Tình trạng lấp đầy
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 700, color: '#64748b' }}
                >
                  Số lượng tồn
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 700, color: '#64748b' }}
                >
                  Phân loại
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apiResponse.groupedData.map((group, index) => (
                <RowGroup key={index} group={group} searchTerm={searchTerm} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Legend Footer */}
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
            Trống thoáng (0-70%)
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
            Sắp đầy (70-90%)
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
            Quá tải ({'>'}90%)
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
