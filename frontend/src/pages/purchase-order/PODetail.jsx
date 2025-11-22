import { useLocation } from 'react-router-dom';
import { Box, Container, Grid } from '@mui/material';
import { mockPOData } from './detail-components/mockData';
import { useState } from 'react';
import PODetailHeader from './detail-components/PODetailHeader';
import POTable from './detail-components/POTable';
import BasicInfoSection from './detail-components/BasicInfoSection';

export default function PODetail() {
  const location = useLocation();
  const _data = location.state;
  const [poData, _setPOData] = useState(mockPOData);

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
        <PODetailHeader poNo={poData.poNo} createdAt={poData.createdAt} />
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 9 }}>
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
              <BasicInfoSection
                status={poData.status}
                statusColor={poData.statusColor}
                updatedAt={poData.updatedAt}
                placedAt={poData.placedAt}
                expectedArrival={poData.expectedArrival}
                supplier={poData.supplier}
              />
              <POTable products={poData.products} />
            </Box>
          </Grid>

          <Grid size={{ xs: 12, lg: 3 }}>
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
              History
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
