import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import InfoCard from '@/components/InfoCard';

export default function BasicInfoSection({ data }) {
  const fields = [
    { label: 'Địa chỉ', value: data.address },
    { label: 'Điện thoại', value: data.phone },
    { label: 'Email', value: data.email },
    { label: 'Website', value: data.website, isLink: true },
    { label: 'Mã số thuế', value: data.taxCode },
    { label: 'Ngành hàng', value: data.category },
    { label: 'Ngày hợp tác', value: data.cooperationDate },
  ];
  return (
    <InfoCard title="Thông tin cơ bản" icon={ApartmentIcon} iconColor="blue">
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
