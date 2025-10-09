import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import DataTable from "@/components/DataTable";
import SearchBar from "@/components/SearchBar";
import ActionButtons from "@/components/ActionButton";
import InventoryToolbar from "./components/InventoryToolbar";
import FormDialog from "./components/FormDialog";
import ViewDialog from "./components/ViewDialog";
import { menuItems } from "./components/MenuConfig";
import {
  warehousesData,
  locationsData,
  productsData,
  batchesData,
  inventoryData,
  movementsData,
} from "./components/mockdata";

const WarehouseManagement = () => {
  const [selectedMenu, setSelectedMenu] = useState("warehouses");
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleAdd = () => {
    setDialogMode("add");
    setSelectedRow(null);
    setOpenDialog(true);
  };

  const handleEdit = (row) => {
    setDialogMode("edit");
    setSelectedRow(row);
    setOpenDialog(true);
  };

  const handleView = (row) => {
    setDialogMode("view");
    setSelectedRow(row);
    setOpenDialog(true);
  };

  const handleDelete = (row) => {
    alert(`Xóa: ${row.name || row.code || row.batchNo || row.sku || row.id}`);
  };

  const handleImport = () => console.log("Import clicked");
  const handleExport = () => console.log("Export clicked");
  const handlePrint = () => console.log("Print clicked");

  const commonProps = {
    onEdit: handleEdit,
    onView: handleView,
    onDelete: handleDelete,
  };

  const dataTables = {
    warehouses: (
      <DataTable
        title="Warehouses"
        columns={menuItems[0].columns}
        data={warehousesData}
        {...commonProps}
      />
    ),
    locations: (
      <DataTable
        title="Locations"
        columns={menuItems[1].columns}
        data={locationsData}
        {...commonProps}
      />
    ),
    products: (
      <DataTable
        title="Products"
        columns={menuItems[2].columns}
        data={productsData}
        {...commonProps}
      />
    ),
    batches: (
      <DataTable
        title="Batches"
        columns={menuItems[3].columns}
        data={batchesData}
        {...commonProps}
      />
    ),
    inventory: (
      <DataTable
        title="Inventory"
        columns={menuItems[4].columns}
        data={inventoryData}
        {...commonProps}
      />
    ),
    movements: (
      <DataTable
        title="Stock Movements"
        columns={menuItems[5].columns}
        data={movementsData}
        {...commonProps}
      />
    ),
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2}}>
      <InventoryToolbar
        menuItems={menuItems}
        selectedMenu={selectedMenu}
        onSelect={setSelectedMenu}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          mt: 2,
        }}
      >
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <ActionButtons
          onAdd={handleAdd}
          onImport={handleImport}
          onExport={handleExport}
          onPrint={handlePrint}
        />
      </Box>

      <Box>
        {dataTables[selectedMenu] || (
          <Typography>Module khác đang phát triển...</Typography>
        )}
      </Box>

      {(dialogMode === "add" || dialogMode === "edit") && (
        <FormDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          mode={dialogMode}
          selectedMenu={selectedMenu}
          selectedRow={dialogMode === "edit" ? selectedRow : null}
        />
      )}

      {dialogMode === "view" && selectedRow && (
        <ViewDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          selectedMenu={selectedMenu}
          selectedRow={selectedRow}
        />
      )}
    </Box>
  );
};

export default WarehouseManagement;
