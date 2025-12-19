import React from "react";
import { TextField, InputAdornment } from "@mui/material";
import { Search } from "@mui/icons-material";

const PRIMARY_COLOR = "#3e468a";

export default function SearchBar({ searchTerm, setSearchTerm, placeholder }) {
  return (
    <TextField
      placeholder={placeholder || "Tìm kiếm..."}
      size="small"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      sx={{
        minWidth: 600,
        "& .MuiOutlinedInput-root": {
          "& fieldset": { borderColor: PRIMARY_COLOR },
          "&:hover fieldset": { borderColor: PRIMARY_COLOR },
          "&.Mui-focused fieldset": { borderColor: PRIMARY_COLOR },
        },
        "& .MuiInputBase-input::placeholder": { opacity: 0.7 },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search sx={{ color: PRIMARY_COLOR }} />
          </InputAdornment>
        ),
      }}
    />
  );
}
