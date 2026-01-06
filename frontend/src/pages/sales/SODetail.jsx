import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Box, Container, Grid } from '@mui/material';
import SOHeader from './detail-components/SOHeader';
import SOTable from './detail-components/SOTable';
import SOInfo from './detail-components/SOInfo';
import SOService from '../../services/so.service';

export default function SODetail() {
  const location = useLocation();
  const { id, row } = location.state || {};
  const [soData, setSOData] = useState(row);

  useEffect(() => {
    if (!id) console.log('No id');
    if (id) {
      SOService.getById(id).then((res) => {
        console.log('SO Data:', res.data);
        setSOData(res.data);
      });
    } else if (row) {
      setSOData(row);
    }
  }, [id, row]);

  const handleSuccess = () => {
    if (id) {
      SOService.getById(id).then((res) => {
        setSOData(res.data);
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
        <SOHeader
          soNo={soData.soNo}
          createdAt={soData.createdAt}
          soId={id || soData.id}
          onCancelSuccess={handleSuccess}
          canCancel={
            soData.status !== 'shipped' && soData.status !== 'cancelled'
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
              <SOInfo
                status={soData.status}
                updatedAt={soData.updatedAt}
                placedAt={soData.placedAt}
                customer={soData.customer}
              />
              <SOTable
                items={soData.items}
                canFulfill={
                  soData.status !== 'pending' && soData.status !== 'cancelled'
                }
                onSOUpdated={handleSuccess}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
