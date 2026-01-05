export const onlyNumber = (v = '') => v.replace(/[^0-9]/g, '');

export const noVietnamese = (v = '') =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

export const onlyLetter = (v = '') => v.replace(/[^a-zA-Z\s]/g, '');
