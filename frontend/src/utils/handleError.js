export const handleError = (err) => {
  console.error("API Error:", err.response?.data);

  const data = err.response?.data;
  let msg = "Something went wrong";

  if (data?.error?.details?.message) {
    const m = data.error.details.message;
    if (Array.isArray(m)) {
      msg = m.join(", ");
    } else if (typeof m === 'string') {
      msg = m;
    }
    // Non-string, non-array types fall through to default
  } else if (data?.message && typeof data.message === 'string') {
    msg = data.message;
  }

  throw msg;
};
