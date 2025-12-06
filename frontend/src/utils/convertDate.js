export function convertDate(value) {
  return value ? new Date(value).toISOString() : null;
}
