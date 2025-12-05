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
  locationsData,
  batchesData,
  fetchCategoriesData,
  fetchProductsData,
  fetchWarehousesData,
} from "./components/data_service";
import ProductCategories from "@/services/category.service";
import ProductService from "@/services/product.service";
import WarehouseService from "@/services/warehouse.service";

const menuConfig = {
  categories: {
    fetchData: fetchCategoriesData,
    service: ProductCategories,
  },
  products: {
    fetchData: fetchProductsData,
    service: ProductService,
  },
  warehouses: {
    fetchData: fetchWarehousesData,
    service: WarehouseService,
  },
  // locations: {
  //   fetchData: fetchLocationsData,
  //   service: LocationService,
  // },
  // batches: {
  //   fetchData: fetchBatchesData,
  //   service: BatchService,
  // },
};

const Warehouse = () => {
  const [selectedMenu, setSelectedMenu] = useState("warehouses");
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [dynamicData, setDynamicData] = useState({});
  const [loading, setLoading] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const staticData = {
    locations: locationsData,
    batches: batchesData,
  };

  useEffect(() => {
    const config = menuConfig[selectedMenu];

    if (config?.fetchData) {
      const loadData = async () => {
        setLoading(true);
        const data = await config.fetchData();
        setDynamicData((prev) => ({ ...prev, [selectedMenu]: data }));
        setLoading(false);
      };
      loadData();
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

    const config = menuConfig[selectedMenu];
    if (config?.service) {
      const res = await config.service.delete(selectedRow.id);
      if (res) {
        const reload = await config.fetchData();
        setDynamicData((prev) => ({ ...prev, [selectedMenu]: reload }));
      }
    }

    setOpenDeleteDialog(false);
  };

  const handleSave = async (formData) => {
    const config = menuConfig[selectedMenu];

    let res;
    if (dialogMode === "edit" && selectedRow?.id) {
      res = await config.service.update(selectedRow.id, formData);
    } else {
      res = await config.service.create(formData);
    }

    if (res) {
      const reload = await config.fetchData();
      setDynamicData((prev) => ({ ...prev, [selectedMenu]: reload }));
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

  const getCurrentData = (menuId) => {
    return dynamicData[menuId] || staticData[menuId] || [];
  };

  const dataTables = Object.fromEntries(
    menuItems.map((menu) => {
      const data = getCurrentData(menu.id);

      return [
        menu.id,
        <DataTable
          key={menu.id}
          title={menu.label}
          columns={menu.columns}
          data={Array.isArray(data) ? data : data?.data || []}
          loading={menuConfig[menu.id] ? loading : undefined}
          {...commonProps}
        />,
      ];
    })
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
