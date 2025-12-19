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
  fetchCategoriesData,
  fetchProductsData,
  fetchWarehousesData,
  fetchLocationsData,
  fetchBatchesData,
} from "./components/data_service";
import ProductCategoryService from "@/services/category.service";
import ProductService from "@/services/product.service";
import WarehouseService from "@/services/warehouse.service";
import LocationService from "@/services/location.service";
import ProductBatchService from "@/services/batch.service";
import { useNavigate } from "react-router-dom";
import { convertDate } from "@/utils/convertDate";
import { CircularProgress } from "@mui/material";

const menuConfig = {
  categories: {
    fetchData: fetchCategoriesData,
    service: ProductCategoryService,
  },
  products: {
    fetchData: fetchProductsData,
    service: ProductService,
  },
  warehouses: {
    fetchData: fetchWarehousesData,
    service: WarehouseService,
  },
  locations: {
    fetchData: fetchLocationsData,
    service: LocationService,
  },
  batches: {
    fetchData: fetchBatchesData,
    service: ProductBatchService,
  },
};

const Warehouse = () => {
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState(() => {
    return localStorage.getItem("selectedMenu") || "warehouses";
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [dynamicData, setDynamicData] = useState({});
  const [loading, setLoading] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

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

  const handleSelectMenu = (menuId) => {
    setSelectedMenu(menuId);
    localStorage.setItem("selectedMenu", menuId);
  };

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
    if (selectedMenu === "batches") {
      navigate(`/warehouse/batches/${row.id}`);
      return;
    }

    if (selectedMenu === "products") {
      navigate(`/warehouse/products/${row.id}`);
      return;
    }

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

    if (selectedMenu === "batches") {
      formData = {
        ...formData,
        manufactureDate: convertDate(formData.manufactureDate),
        expiryDate: convertDate(formData.expiryDate),
        quantity: parseInt(formData.quantity),
      };
    }

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
    return dynamicData[menuId] || [];
  };

  const getSearchableColumns = () => {
    if (!currentMenuConfig) return [];
    return currentMenuConfig.columns.filter(
      (col) => col.search !== false && col.id !== "stt"
    );
  };

  const getSearchPlaceholder = () => {
    const menu = menuItems.find((m) => m.id === selectedMenu);
    if (!menu) return "Search...";

    const searchableColumns = menu.columns.filter(
      (col) => col.search !== false && col.id !== "stt"
    );
    if (searchableColumns.length === 0) {
      return "Search...";
    }

    const labels = searchableColumns.map((c) => c.label);
    return `Search for ${labels.join(", ").toLocaleLowerCase()}`;
  };

  const applySearch = (data) => {
    if (!searchTerm) return data;

    const keyword = searchTerm.toLowerCase();
    const searchableColumns = getSearchableColumns();

    return data.filter((row) =>
      searchableColumns.some((col) => {
        let value;

        if (typeof col.searchValue === "function") {
          value = col.searchValue(row);
        } else {
          value = row[col.id];
        }
        if (value === undefined || value === null) return false;

        return String(value).toLowerCase().includes(keyword);
      })
    );
  };

  const dataTables = Object.fromEntries(
    menuItems.map((menu) => {
      const rawData = getCurrentData(menu.id);
      const tableData = Array.isArray(rawData) ? rawData : rawData?.data || [];

      const finalData = menu.id === selectedMenu ? applySearch(tableData) : tableData;

      return [
        menu.id,
        <DataTable
          key={menu.id}
          title={menu.label}
          columns={menu.columns}
          data={finalData}
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
        onSelect={handleSelectMenu}
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
        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder={getSearchPlaceholder()}
        />
        <ActionButtons
          onAdd={handleAdd}
          onImport={handleImport}
          onExport={handleExport}
          onPrint={handlePrint}
        />
      </Box>

      <Box sx={{ position: "relative", minHeight: "200px" }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "200px",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          dataTables[selectedMenu] || <Typography>In progress...</Typography>
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
