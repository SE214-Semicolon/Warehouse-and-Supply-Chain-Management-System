export function formatDate(date) {
  // Handle falsy values except 0
  if (date === null || date === undefined || date === "") return "-";
  
  // Handle zero explicitly (0 timestamp should return "-")
  if (date === 0) return "-";
  
  // Handle booleans and arrays explicitly
  if (typeof date === 'boolean' || Array.isArray(date)) return "-";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("vi-VN");
}

export function formatDateTime(date) {
  if (date === null || date === undefined || date === "") return "-";
  if (date === 0) return "-";
  if (typeof date === "boolean" || Array.isArray(date)) return "-";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleString("vi-VN", {
    hour12: false, // 24h format
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
