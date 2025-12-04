import React, { useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
  Divider,
} from "@mui/material";
import { Visibility, Edit, Delete, FilterList } from "@mui/icons-material";

export default function DataTable({
  columns, // Format { id, label, sortable: true/false, filterable: true/false, render: (value, row) => ... }
  data = [],
  onEdit,
  onView,
  onDelete,
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState("asc");
  const [columnFilters, setColumnFilters] = useState({});
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterClick = (event, columnId) => {
    setFilterAnchor(event.currentTarget);
    setActiveFilterColumn(columnId);
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
    setActiveFilterColumn(null);
  };

  const handleSortAZ = (columnId) => {
    setOrderBy(columnId);
    setOrder("asc");
  };

  const handleSortZA = (columnId) => {
    setOrderBy(columnId);
    setOrder("desc");
  };

  const getUniqueValues = (columnId) => {
    const values = data
      .map((row) => row[columnId])
      .filter((val) => val !== null && val !== undefined && val !== "");
    return [...new Set(values)];
  };

  const handleFilterToggle = (columnId, value) => {
    setColumnFilters((prev) => {
      const current = prev[columnId] || [];
      const newValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      return {
        ...prev,
        [columnId]: newValues,
      };
    });
  };

  const handleSelectAll = (columnId) => {
    const allValues = getUniqueValues(columnId);
    setColumnFilters((prev) => ({
      ...prev,
      [columnId]: allValues,
    }));
  };

  const handleClearFilter = (columnId) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnId]: [],
    }));
  };

  const filteredData = data.filter((row) => {
    const matchFilters = Object.entries(columnFilters).every(
      ([columnId, selectedValues]) => {
        if (!selectedValues || selectedValues.length === 0) return true;
        return selectedValues.includes(row[columnId]);
      }
    );

    return matchFilters;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!orderBy) return 0;
    const aVal = a[orderBy];
    const bVal = b[orderBy];
    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const renderCellContent = (col, row, index) => {
    if (col.id === "stt") {
      return page * rowsPerPage + index + 1;
    }

    if (col.render) {
      return col.render(row[col.id], row);
    }

    return row[col.id];
  };

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table
          sx={{
            "& th, & td": {
              border: "1px solid #929292c3",
            },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  sx={{
                    backgroundColor: "#3E468A",
                    color: "white",
                    fontWeight: "bold",
                    padding: "12px 16px",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.5,
                    }}
                  >
                    <span>{col.label}</span>

                    {col.filterable !== false && col.id !== "stt" && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleFilterClick(e, col.id)}
                        sx={{
                          color: "white",
                          opacity: columnFilters[col.id]?.length > 0 ? 1 : 0.7,
                          "&:hover": { opacity: 1 },
                        }}
                      >
                        <FilterList fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  backgroundColor: "#3E468A",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                Action
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow key={row.id} hover>
                {columns.map((col) => (
                  <TableCell key={col.id} align="center">
                    {renderCellContent(col, row, index)}
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{
                    width: 0.15,
                    maxWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    {onView && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() =>
                          onView({
                            ...row,
                            stt: page * rowsPerPage + index + 1,
                          })
                        }
                      >
                        <Visibility />
                      </IconButton>
                    )}

                    {onEdit && (
                      <IconButton
                        size="small"
                        onClick={() => onEdit(row)}
                        sx={{ color: "#1a7d45ff" }}
                      >
                        <Edit />
                      </IconButton>
                    )}

                    {onDelete && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(row)}
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredData.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} trong ${count}`
          }
        />
      </TableContainer>

      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        {activeFilterColumn && (
          <Box sx={{ width: 250, p: 2 }}>
            {columns.find((c) => c.id === activeFilterColumn)?.sortable !==
              false && (
              <>
                <ListItemButton
                  dense
                  onClick={() => {
                    handleSortAZ(activeFilterColumn);
                    handleFilterClose();
                  }}
                >
                  <ListItemText primary="Sort A to Z" />
                </ListItemButton>
                <ListItemButton
                  dense
                  onClick={() => {
                    handleSortZA(activeFilterColumn);
                    handleFilterClose();
                  }}
                >
                  <ListItemText primary="Sort Z to A" />
                </ListItemButton>
                <Divider sx={{ my: 1 }} />
              </>
            )}

            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <Button
                size="small"
                sx={{ color: "#7F408E" }}
                onClick={() => handleSelectAll(activeFilterColumn)}
              >
                Select all
              </Button>
              <Button
                size="small"
                sx={{ color: "#7F408E" }}
                onClick={() => handleClearFilter(activeFilterColumn)}
              >
                Clear
              </Button>
            </Box>
            <Divider sx={{ mb: 1 }} />

            <List sx={{ maxHeight: 300, overflow: "auto" }}>
              {getUniqueValues(activeFilterColumn).map((value) => (
                <ListItem key={value} disablePadding>
                  <ListItemButton
                    dense
                    onClick={() =>
                      handleFilterToggle(activeFilterColumn, value)
                    }
                  >
                    <Checkbox
                      edge="start"
                      checked={
                        columnFilters[activeFilterColumn]?.includes(value) ||
                        false
                      }
                      disableRipple
                    />
                    <ListItemText primary={value} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                size="small"
                sx={{ color: "#7F408E" }}
                onClick={handleFilterClose}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                sx={{ background: "#7F408E" }}
                onClick={handleFilterClose}
              >
                OK
              </Button>
            </Box>
          </Box>
        )}
      </Popover>
    </Box>
  );
}
