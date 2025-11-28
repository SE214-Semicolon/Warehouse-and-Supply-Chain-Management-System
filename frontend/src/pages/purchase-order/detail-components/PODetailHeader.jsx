import { Card, Box, Typography, Button } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';

export default function PODetailHeader({ poNo, createdAt }) {
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
            {poNo}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: '1.125rem',
              color: 'text.secondary',
              marginTop: 1,
            }}
          >
            Ngày tạo:
            <Box
              component="span"
              sx={{
                fontWeight: 'semibold',
                color: 'primary.main',
                marginLeft: 1,
              }}
            >
              {createdAt}
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
            variant="outlined"
            sx={{
              borderColor: 'grey.300',
              color: 'text.primary',
              paddingX: 2.5,
              paddingY: 1.25,
              borderRadius: '0.5rem',
              '&:hover': {
                backgroundColor: 'grey.50',
                borderColor: 'grey.400',
              },
            }}
            startIcon={<PrintIcon />}
          >
            In PO
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon size={18} />}
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
            Chỉnh sửa
          </Button>
        </Box>
      </Box>
    </Card>
  );
}
