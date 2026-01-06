import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Box, Container, Grid } from '@mui/material';
import CustomerHeader from './detail-components/CustomerHeader';
import CustomerInfo from './detail-components/CustomerInfo';
import CustomerSOs from './detail-components/CustomerSOs';
import CustomerService from '../../services/customer.service';
import SOService from '../../services/so.service';

export default function CustomerDetail() {
  const location = useLocation();
  const { id, row } = location.state || {};
  const [customerData, setCustomerData] = useState(row);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingSOs, setLoadingSOs] = useState(true);

  useEffect(() => {
    if (id) {
      CustomerService.getById(id).then((res) => {
        setCustomerData(res.data);
      });
    } else if (row) {
      setCustomerData(row);
    }
  }, [id, row]);

  useEffect(() => {
    if (!customerData?.id) return;

    setLoadingSOs(true);
    SOService.getAll(customerData.id)
      .then((response) => {
        if (Array.isArray(response.data)) {
          console.log('Recent SOs response:', response);
          setRecentOrders(response.data);
        } else {
          setRecentOrders([]);
        }
      })
      .catch(() => {
        setRecentOrders([]);
      })
      .finally(() => {
        setLoadingSOs(false);
      });
  }, [customerData?.id]);

  const handleUpdateSuccess = (updatedCustomer) => {
    setCustomerData(updatedCustomer.data);
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
        <CustomerHeader
          customer={customerData}
          onSuccess={handleUpdateSuccess}
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
              <CustomerInfo data={customerData} />
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
              <CustomerSOs orders={recentOrders} loading={loadingSOs} />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
