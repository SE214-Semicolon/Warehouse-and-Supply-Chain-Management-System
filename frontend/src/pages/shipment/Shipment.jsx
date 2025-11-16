import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import DataTable from "@/components/DataTable";
import SearchBar from "@/components/SearchBar";
import ActionButtons from "@/components/ActionButton";
import InventoryToolbar from "./components/ShipmentToolbar";
import FormDialog from "./components/FormDialog";
import ViewDialog from "./components/ViewDialog";
import { menuItems } from "./components/MenuConfig";
import {
  shipmentsData,
  shipmentItemsData,
  trackingEventsData,
} from "./components/data_service";

const Shipment = () => {
  const [selectedMenu, setSelectedMenu] = useState("shipments");
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

  const handleSave = () => console.log("Đã lưu");
  const handleImport = () => console.log("Import clicked");
  const handleExport = () => console.log("Export clicked");
  const handlePrint = () => console.log("Print clicked");

  const commonProps = {
    onEdit: handleEdit,
    onView: handleView,
    onDelete: handleDelete,
  };

  const datasetMap = {
    shipments: shipmentsData,
    "shipment-items": shipmentItemsData,
    "tracking-events": trackingEventsData,
  };

  const dataTables = Object.fromEntries(
    menuItems.map((menu) => [
      menu.id,
      <DataTable
        key={menu.id}
        title={menu.label}
        columns={menu.columns}
        data={datasetMap[menu.id] || []}
        {...commonProps}
      />,
    ])
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
          onAction={handleSave}
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

export default Shipment;
