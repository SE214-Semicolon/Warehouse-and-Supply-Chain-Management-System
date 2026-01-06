import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Box, Container, Grid } from '@mui/material';
import PODetailHeader from './detail-components/PODetailHeader';
import POTable from './detail-components/POTable';
import BasicInfoSection from './detail-components/BasicInfoSection';
import POService from '../../services/po.service';

export default function PODetail() {
  const location = useLocation();
  const { id, row } = location.state || {};
  const [poData, setPOData] = useState(row);

  useEffect(() => {
    if (id) {
      POService.getById(id).then((res) => {
        console.log('PO Data:', res.data);
        setPOData(res.data);
      });
    } else if (row) {
      setPOData(row);
    }
  }, [id, row]);

  const handleCancelSuccess = () => {
    if (id) {
      POService.getById(id).then((res) => {
        setPOData(res.data);
      });
    }
  };

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
        <PODetailHeader
          poNo={poData.poNo}
          createdAt={poData.createdAt}
          poId={id || poData.id}
          onCancelSuccess={handleCancelSuccess}
          canCancel={
            poData.status !== 'received' && poData.status !== 'cancelled'
          }
        />
        <Grid container spacing={4}>
          <Grid size={{ xs: 12 }}>
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
                updatedAt={poData.updatedAt}
                placedAt={poData.placedAt}
                expectedArrival={poData.expectedArrival}
                supplier={poData.supplier}
              />
              <POTable
                items={poData.items}
                canReceive={
                  poData.status !== 'draft' && poData.status !== 'cancelled'
                }
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
