export const handleError = (err) => {
  console.error("API Error:", err.response?.data);

  const data = err.response?.data;
  let msg = "Something went wrong";

  if (data?.error?.details?.message) {
    const m = data.error.details.message;
    msg = Array.isArray(m) ? m.join(", ") : m;
  } else if (data?.message) {
    msg = data.message;
  }

  throw msg;
};
