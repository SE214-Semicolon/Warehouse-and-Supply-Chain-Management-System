import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import DataTable from "@/components/DataTable";
import SearchBar from "@/components/SearchBar";
import ActionButtons from "@/components/ActionButton";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import WarehouseToolbar from "./components/WarehouseToolbar";
import FormDialog from "./components/FormDialog";
import ViewDialog from "./components/ViewDialog";
import { menuItems } from "./components/MenuConfig";
import {
  warehousesData,
  locationsData,
  productsData,
  batchesData,
  fetchCategoriesData,
} from "./components/data_service";
import ProductCategories from "@/services/category.service";

const Warehouse = () => {
  const [selectedMenu, setSelectedMenu] = useState("warehouses");
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriesData, setCategoriesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  useEffect(() => {
    if (selectedMenu === "categories") {
      const loadCategories = async () => {
        setLoading(true);
        const data = await fetchCategoriesData();
        setCategoriesData(data);
        setLoading(false);
      };
      loadCategories();
    }
  }, [selectedMenu]);

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
    setSelectedRow(row);
    setOpenDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedRow?.id) return;

    if (selectedMenu === "categories") {
      const res = await ProductCategories.deletey(selectedRow.id);
      if (res) {
        const reload = await fetchCategoriesData();
        setCategoriesData(reload);
      }
    }

    setOpenDeleteDialog(false);
  };

  const handleSave = async (formData) => {
    if (selectedMenu === "categories") {
      let res;
      if (dialogMode === "edit" && selectedRow?.id) {
        res = await ProductCategories.update(selectedRow.id, formData);
      } else {
        res = await ProductCategories.create(formData);
      }
      if (res) {
        const reload = await fetchCategoriesData();
        setCategoriesData(reload);
      }
    }

    setOpenDialog(false);
  };

  const handleImport = () => console.log("Import clicked");
  const handleExport = () => console.log("Export clicked");
  const handlePrint = () => console.log("Print clicked");

  const currentMenuConfig = menuItems.find((menu) => menu.id === selectedMenu);

  const commonProps = {
    onEdit: handleEdit,
    onDelete: handleDelete,
    onView: currentMenuConfig?.allowView === false ? undefined : handleView,
  };

  const datasetMap = {
    warehouses: warehousesData,
    categories: categoriesData,
    locations: locationsData,
    products: productsData,
    batches: batchesData,
  };

  const dataTables = Object.fromEntries(
    menuItems.map((menu) => [
      menu.id,
      <DataTable
        key={menu.id}
        title={menu.label}
        columns={menu.columns}
        data={
          Array.isArray(datasetMap[menu.id])
            ? datasetMap[menu.id]
            : Array.isArray(datasetMap[menu.id]?.data)
            ? datasetMap[menu.id].data
            : []
        }
        loading={menu.id === "categories" ? loading : undefined}
        {...commonProps}
      />,
    ])
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <WarehouseToolbar
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
        {dataTables[selectedMenu] || <Typography>In progress...</Typography>}
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

      <ConfirmDeleteDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={confirmDelete}
        selectedRow={selectedRow}
      />
    </Box>
  );
};

export default Warehouse;
