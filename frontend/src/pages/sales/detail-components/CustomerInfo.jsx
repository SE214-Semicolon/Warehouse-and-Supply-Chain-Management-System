import React, { useEffect, useState } from 'react';
import { Box, Typography, Link } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import InfoCard from '@/components/InfoCard';

export default function CustomerInfo({ data }) {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    setFields([
      { label: 'Name', value: data?.name },
      { label: 'Phone', value: data?.contactInfo?.phone },
      { label: 'Email', value: data?.contactInfo?.email },
      { label: 'Address', value: data?.address },
    ]);
  }, [data]);

  return (
    <InfoCard title="Information" icon={ApartmentIcon} iconColor="blue">
      <Box
        sx={{
          '& > div': {
            marginBottom: 2,
          },
          '& > div:last-child': {
            marginBottom: 0,
          },
          color: 'text.secondary',
          fontSize: '0.825rem',
        }}
      >
        {fields.map((field, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              minHeight: { xs: 32, sm: 'auto' },
            }}
          >
            <Typography
              component="strong"
              sx={{
                width: { sm: 128 },
                fontWeight: 'medium',
                color: 'text.primary',
                marginRight: 1,
                marginBottom: { xs: 0.5, sm: 0 },
                flexShrink: { xs: 0, sm: 0 },
              }}
            >
              {field.label}:
            </Typography>
            {field.isLink ? (
              <Link
                href={field.value}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'primary.main',
                  fontSize: '1rem',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                  wordBreak: 'break-all',
                }}
              >
                {field.value}
              </Link>
            ) : (
              <Typography
                sx={{
                  flexGrow: 1,
                  color: 'text.secondary',
                  overflowWrap: 'break-word',
                  wordBreak: 'normal',
                }}
              >
                {field.value}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </InfoCard>
  );
}
