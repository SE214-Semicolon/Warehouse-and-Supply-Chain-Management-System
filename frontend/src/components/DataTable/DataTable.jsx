import { useState, useMemo, useRef, useEffect } from "react";
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
import React from "react";

export default function DataTable({ columns, data = [], onEdit, onView, onDelete }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState("asc");
  const [columnFilters, setColumnFilters] = useState({});
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);

  const hasActions = Boolean(onEdit || onView || onDelete);

  const tableContainerRef = useRef(null);

  const getNestedValue = (obj, path) => {
    if (!path || !obj) return null;
    if (!path.includes(".")) return obj[path];

    return path
      .split(".")
      .reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj);
  };

  useEffect(() => {
    if (tableContainerRef.current) {
      const { top } = tableContainerRef.current.getBoundingClientRect();
      if (top < 60) {
        tableContainerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  }, [page, rowsPerPage]);

  const processedData = useMemo(() => {
    return data.map((row, index) => {
      const formattedRow = { ...row, stt: index + 1, _original: row };

      columns.forEach((col) => {
        const rawValue = getNestedValue(row, col.id);

        if (col.valueGetter) {
          formattedRow[col.id] = col.valueGetter(row);
        } else if (col.render) {
          const renderedValue = col.render(rawValue, row);
          if (
            !React.isValidElement(renderedValue) &&
            (typeof renderedValue === "string" || typeof renderedValue === "number")
          ) {
            formattedRow[col.id] = renderedValue;
          }
        }

        if (formattedRow[col.id] === undefined) {
          formattedRow[col.id] =
            rawValue !== undefined && rawValue !== null ? rawValue : "";
        }
      });
      return formattedRow;
    });
  }, [data, columns]);

  const filteredData = processedData.filter((row) => {
    return Object.entries(columnFilters).every(([columnId, selectedValues]) => {
      if (!selectedValues || selectedValues.length === 0) return true;
      return selectedValues.includes(row[columnId]);
    });
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!orderBy) return 0;
    const aVal = a[orderBy];
    const bVal = b[orderBy];

    if (aVal === bVal) return 0;

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_event, newPage) => {
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
    const values = processedData
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
      return { ...prev, [columnId]: newValues };
    });
  };
  const handleSelectAll = (columnId) => {
    const allValues = getUniqueValues(columnId);
    setColumnFilters((prev) => ({ ...prev, [columnId]: allValues }));
  };
  const handleClearFilter = (columnId) => {
    setColumnFilters((prev) => ({ ...prev, [columnId]: [] }));
  };

  return (
    <Box>
      <TableContainer
        component={Paper}
        ref={tableContainerRef}
        sx={{ scrollMarginTop: "60px" }}
      >
        <Table sx={{ "& th, & td": { border: "1px solid #929292c3" } }}>
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
              {hasActions && (
                <TableCell
                  align="center"
                  sx={{
                    backgroundColor: "#3E468A",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow key={row.id || index} hover>
                {columns.map((col) => {
                  const rawValue = getNestedValue(row._original, col.id);

                  const cellValue = col.render
                    ? col.render(rawValue, row._original)
                    : row[col.id];

                  return (
                    <TableCell key={col.id} align={col.align || "center"}>
                      {cellValue}
                    </TableCell>
                  );
                })}

                {hasActions && (
                  <TableCell align="center" sx={{ width: 180 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 0.5,
                      }}
                    >
                      {onView && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => onView(row._original)}
                        >
                          <Visibility />
                        </IconButton>
                      )}
                      {onEdit && (
                        <IconButton
                          size="small"
                          onClick={() => onEdit(row._original)}
                          sx={{ color: "#1a7d45ff" }}
                        >
                          <Edit />
                        </IconButton>
                      )}
                      {onDelete && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(row._original)}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}

            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  align="center"
                  sx={{ py: 3 }}
                >
                  No matching data found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredData.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Number of lines per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} in ${count}`}
        />
      </TableContainer>

      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={handleFilterClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {activeFilterColumn && (
          <Box sx={{ width: 250, p: 2 }}>
            {columns.find((c) => c.id === activeFilterColumn)?.sortable !== false && (
              <>
                <ListItemButton
                  dense
                  onClick={() => {
                    handleSortAZ(activeFilterColumn);
                    handleFilterClose();
                  }}
                >
                  <ListItemText primary="Sort A - Z" />
                </ListItemButton>
                <ListItemButton
                  dense
                  onClick={() => {
                    handleSortZA(activeFilterColumn);
                    handleFilterClose();
                  }}
                >
                  <ListItemText primary="Sort Z - A" />
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
                All
              </Button>
              <Button
                size="small"
                sx={{ color: "#7F408E" }}
                onClick={() => handleClearFilter(activeFilterColumn)}
              >
                Delete filter
              </Button>
            </Box>
            <Divider sx={{ mb: 1 }} />

            <List sx={{ maxHeight: 250, overflow: "auto" }}>
              {getUniqueValues(activeFilterColumn).map((value) => (
                <ListItem key={value} disablePadding>
                  <ListItemButton
                    dense
                    onClick={() => handleFilterToggle(activeFilterColumn, value)}
                  >
                    <Checkbox
                      edge="start"
                      checked={
                        columnFilters[activeFilterColumn]?.includes(value) || false
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
