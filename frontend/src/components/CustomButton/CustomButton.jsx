import { Button, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';

const CustomStyledButton = styled(Button)(({ variant, color, size }) => ({
  ...(variant === 'contained' && {
    backgroundColor:
      color === 'primary'
        ? '#7f408e'
        : color === 'secondary'
        ? '#3e468a'
        : '#ff7b47',
    color: 'white',
    '&:hover': {
      backgroundColor:
        color === 'primary'
          ? '#6d357c'
          : color === 'secondary'
          ? '#2f375f'
          : '#e06b3f',
    },
  }),
  ...(variant === 'outlined' && {
    borderColor:
      color === 'primary'
        ? '#7f408e'
        : color === 'secondary'
        ? '#3e468a'
        : '#ff7b47',
    color:
      color === 'primary'
        ? '#7f408e'
        : color === 'secondary'
        ? '#3e468a'
        : '#ff7b47',
    '&:hover': {
      borderColor:
        color === 'primary'
          ? '#6d357c'
          : color === 'secondary'
          ? '#2f375f'
          : '#e06b3f',
      backgroundColor: 'rgba(127, 64, 142, 0.04)', // Hover nhẹ với primary
    },
  }),
  ...(variant === 'text' && {
    color:
      color === 'primary'
        ? '#7f408e'
        : color === 'secondary'
        ? '#3e468a'
        : '#ff7b47',
    '&:hover': {
      backgroundColor: 'rgba(127, 64, 142, 0.04)', // Hover nhẹ
      textDecoration: 'underline',
    },
  }),
  fontFamily: 'Roboto, sans-serif',
  fontWeight: 500,
  textTransform: 'none', // Loại bỏ uppercase mặc định
  padding: '12px 16px', // Đồng bộ với py: 1.5 và px: 2
  ...(size === 'small' && { padding: '8px 12px', fontSize: '0.875rem' }),
  ...(size === 'large' && { padding: '16px 24px', fontSize: '1.125rem' }),
}));

const CustomButton = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  label,
  icon: Icon,
  onClick,
  ...props
}) => {
  const handleClick = (e) => {
    if (onClick) onClick(e);
  };

  if (Icon) {
    return (
      <IconButton
        onClick={handleClick}
        sx={{
          ...(variant === 'contained' && {
            backgroundColor:
              color === 'primary'
                ? '#7f408e'
                : color === 'secondary'
                ? '#3e468a'
                : '#ff7b47',
            color: 'white',
            '&:hover': {
              backgroundColor:
                color === 'primary'
                  ? '#6d357c'
                  : color === 'secondary'
                  ? '#2f375f'
                  : '#e06b3f',
            },
          }),
          ...(variant === 'outlined' && {
            border: `1px solid ${
              color === 'primary'
                ? '#7f408e'
                : color === 'secondary'
                ? '#3e468a'
                : '#ff7b47'
            }`,
            color:
              color === 'primary'
                ? '#7f408e'
                : color === 'secondary'
                ? '#3e468a'
                : '#ff7b47',
            '&:hover': {
              borderColor:
                color === 'primary'
                  ? '#6d357c'
                  : color === 'secondary'
                  ? '#2f375f'
                  : '#e06b3f',
              backgroundColor: 'rgba(127, 64, 142, 0.04)',
            },
          }),
          ...(variant === 'text' && {
            color:
              color === 'primary'
                ? '#7f408e'
                : color === 'secondary'
                ? '#3e468a'
                : '#ff7b47',
            '&:hover': {
              backgroundColor: 'rgba(127, 64, 142, 0.04)',
              textDecoration: 'underline',
            },
          }),
          fontFamily: 'Roboto, sans-serif',
          fontWeight: 500,
          ...(size === 'small' && {
            width: 36,
            height: 36,
            fontSize: '0.875rem',
          }),
          ...(size === 'large' && {
            width: 48,
            height: 48,
            fontSize: '1.125rem',
          }),
        }}
        {...props}
      >
        <Icon />
      </IconButton>
    );
  }

  return (
    <CustomStyledButton
      variant={variant}
      color={color}
      size={size}
      onClick={handleClick}
      {...props}
    >
      {label}
    </CustomStyledButton>
  );
};

export default CustomButton;
