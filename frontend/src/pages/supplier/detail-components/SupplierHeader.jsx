import { Card, Box, Typography, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useEffect, useState } from 'react';
import FormDialog from '../components/FormDialog';

export default function SupplierHeader({ supplier, onSuccess }) {
  const [openDialog, setOpenDialog] = useState(false);
  const [sup, setSup] = useState({});

  useEffect(() => {
    setSup(supplier);
  }, [supplier]);

  return (
    <Card
      sx={{
        padding: 3,
        marginBottom: 3,
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
        }}
      >
        <div>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 'bold',
              color: 'text.primary',
            }}
          >
            {sup.name}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: '1.125rem',
              color: 'text.secondary',
              marginTop: 1,
            }}
          >
            Supplier code:
            <Box
              component="span"
              sx={{
                fontWeight: 'semibold',
                color: 'primary.main',
                marginLeft: 1,
              }}
            >
              {sup.code}
            </Box>
          </Typography>
        </div>
        <Box
          sx={{
            marginTop: { xs: 2, md: 0 },
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon size={18} />}
            onClick={() => setOpenDialog(true)}
            sx={{
              backgroundColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              color: 'white',
              paddingX: 2.5,
              paddingY: 1.25,
              borderRadius: 1,
              fontWeight: 'medium',
              transition: 'background-color 0.3s ease',
            }}
          >
            Edit
          </Button>
          <FormDialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            mode="edit"
            selectedRow={supplier}
            onSuccess={onSuccess}
          />
        </Box>
      </Box>
    </Card>
  );
}
