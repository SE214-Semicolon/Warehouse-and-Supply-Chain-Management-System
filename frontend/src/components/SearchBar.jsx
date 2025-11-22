import React from "react";
import { TextField, InputAdornment } from "@mui/material";
import { Search } from "@mui/icons-material";

export default function SearchBar({ searchTerm, setSearchTerm, placeholder }) {
  return (
    <TextField
      placeholder={placeholder || "Tìm kiếm..."}
      size="small"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      sx={{ minWidth: 300 }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        ),
      }}
    />
  );
}
