import { useState, useEffect, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";

import DataTable from "@/components/DataTable";
import SearchBar from "@/components/SearchBar";
import ActionButtons from "@/components/ActionButton";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import WarehouseToolbar from "./components/WarehouseToolbar";
import FormDialog from "./components/FormDialog";

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
import { convertDate } from "@/utils/convertDate";

const menuConfig = {
  categories: { fetchData: fetchCategoriesData, service: ProductCategoryService },
  products: { fetchData: fetchProductsData, service: ProductService },
  warehouses: { fetchData: fetchWarehousesData, service: WarehouseService },
  locations: { fetchData: fetchLocationsData, service: LocationService },
  batches: { fetchData: fetchBatchesData, service: ProductBatchService },
};

const viewRoutes = {
  warehouses: "/warehouse/warehouses",
  locations: "/warehouse/locations",
  products: "/warehouse/products",
  batches: "/warehouse/batches",
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

        const cleanData = Array.isArray(data) ? data : data?.data || [];
        setDynamicData((prev) => ({ ...prev, [selectedMenu]: cleanData }));
        setLoading(false);
      };
      loadData();
    }
  }, [selectedMenu]);

  const handleSelectMenu = (menuId) => {
    setSelectedMenu(menuId);
    setSearchTerm("");
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
    const basePath = viewRoutes[selectedMenu];
    if (basePath) {
      navigate(`${basePath}/${row.id}`);
    }
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
        const cleanData = Array.isArray(reload) ? reload : reload?.data || [];
        setDynamicData((prev) => ({ ...prev, [selectedMenu]: cleanData }));
      }
    }

    setOpenDeleteDialog(false);
  };

  const handleSave = async (formData) => {
    const config = menuConfig[selectedMenu];
    let preparedData = { ...formData };

    if (selectedMenu === "batches") {
      preparedData = {
        ...preparedData,
        manufactureDate: convertDate(formData.manufactureDate),
        expiryDate: convertDate(formData.expiryDate),
        quantity: parseInt(formData.quantity),
      };
    }

    if (dialogMode === "edit" && selectedRow?.id) {
      await config.service.update(selectedRow.id, preparedData);
    } else {
      await config.service.create(preparedData);
    }

    const reload = await config.fetchData();
    const cleanData = Array.isArray(reload) ? reload : reload?.data || [];
    setDynamicData((prev) => ({ ...prev, [selectedMenu]: cleanData }));
  };

  const currentMenuConfig = menuItems.find((m) => m.id === selectedMenu);

  const filteredAndSearchedData = useMemo(() => {
    const rawData = dynamicData[selectedMenu] || [];
    if (!searchTerm) return rawData;

    const keyword = searchTerm.toLowerCase();
    const searchableColumns =
      currentMenuConfig?.columns.filter(
        (col) => col.search !== false && col.id !== "stt"
      ) || [];

    return rawData.filter((row) =>
      searchableColumns.some((col) => {
        let value;
        if (typeof col.searchValue === "function") {
          value = col.searchValue(row);
        } else if (col.render) {
          value = col.render(row[col.id], row);
        } else {
          value = row[col.id];
        }
        return String(value || "")
          .toLowerCase()
          .includes(keyword);
      })
    );
  }, [dynamicData, selectedMenu, searchTerm, currentMenuConfig]);

  const getSearchPlaceholder = () => {
    if (!currentMenuConfig) return "Search...";
    const labels = currentMenuConfig.columns
      .filter((col) => col.search !== false && col.id !== "stt")
      .map((c) => c.label.toLowerCase());
    return `Search ${labels.join(", ")}...`;
  };

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
          onImport={() => console.log("Importing...")}
          onExport={() => console.log("Exporting...")}
          onPrint={() => console.log("Printing...")}
        />
      </Box>

      <Box sx={{ position: "relative", minHeight: "200px", mt: 1 }}>
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
          <DataTable
            key={selectedMenu}
            columns={currentMenuConfig?.columns || []}
            data={filteredAndSearchedData}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={currentMenuConfig?.allowView === false ? undefined : handleView}
          />
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
