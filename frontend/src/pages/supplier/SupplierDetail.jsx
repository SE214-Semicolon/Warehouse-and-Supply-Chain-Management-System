import { useLocation } from 'react-router-dom';
import mockSupplierData from './detail-components/mockData';
import { useEffect, useState } from 'react';
import { Box, Container, Grid } from '@mui/material';
import SupplierHeader from './detail-components/SupplierHeader';
import BasicInfoSection from './detail-components/BasicInfoSection';
import PerformaceSection from './detail-components/PerformaceSection';
import StatCard from './detail-components/StatCard';
import RecentPOs from './detail-components/RecentPOs';

export default function SupplierDetail() {
  const location = useLocation();
  const { _id, row } = location.state;
  const [supplierData, setSupplierData] = useState(row);
  const stats = mockSupplierData.stats;
  const performance = mockSupplierData.performance;
  const recentOrders = mockSupplierData.recentOrders;

  useEffect(() => {
    // setSupplierData(data);
    console.log(row);
  }, [row]);

  return (
    <Box
      sx={{
        backgroundColor: 'grey.50',
        minHeight: '100vh',
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          paddingY: 4,
          paddingX: { xs: 2, sm: 4 },
        }}
      >
        <SupplierHeader
          supplier={supplierData}
          onSuccess={(sup) => setSupplierData(sup)}
        />

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Box
              sx={{
                '& > *': {
                  marginBottom: 3,
                },
                '& > *:last-child': {
                  marginBottom: 0,
                },
              }}
            >
              <BasicInfoSection data={supplierData} />
              <PerformaceSection performance={performance} />
            </Box>
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
            <Box
              sx={{
                '& > *': {
                  marginBottom: 3,
                },
                '& > *:last-child': {
                  marginBottom: 0,
                },
              }}
            >
              <Grid container spacing={4}>
                {stats.map((stat, index) => (
                  <Grid size={{ xs: 6, md: 3 }} key={index}>
                    <StatCard stat={stat} />
                  </Grid>
                ))}
              </Grid>

              <RecentPOs orders={recentOrders} />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
