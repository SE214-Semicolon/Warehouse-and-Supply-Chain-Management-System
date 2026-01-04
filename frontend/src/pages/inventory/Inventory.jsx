import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Button,
  Autocomplete,
  TextField,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Fade,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";

import InventoryService from "@/services/inventory.service";
import ProductBatchService from "@/services/batch.service";
import LocationService from "@/services/location.service";
import UserService from "@/services/user.service";
import DataTable from "@/components/DataTable";
import SearchBar from "@/components/SearchBar";
import ActionButtons from "@/components/ActionButton";
import MovementDialog from "../warehouse/components/batch_detail/MovementDialog";
import { getInventoryColumns, movementColumns } from "./components/InventoryConfig";

const Inventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [tab, setTab] = useState(0);

  const [openMovement, setOpenMovement] = useState(false);
  const [movementType, setMovementType] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);

  const fetchInventoryData = useCallback(async (batchId) => {
    if (!batchId) return;
    setLoading(true);
    setSearchTerm("");
    try {
      const [invRes, movRes] = await Promise.all([
        InventoryService.getByBatch(batchId),
        InventoryService.getMovementByBatch(batchId),
      ]);
      setInventory(invRes?.inventories || invRes?.data?.inventories || []);
      setMovements(movRes?.movements || []);
    } catch (error) {
      console.error("Fetch data error", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      try {
        const [batchRes, locRes, user] = await Promise.all([
          ProductBatchService.getAll(),
          LocationService.getAll(),
          UserService.getCurrentUser(),
        ]);

        const batchList = batchRes?.data?.data || batchRes?.data || [];
        setBatches(batchList);
        setLocations(locRes?.data?.data || locRes?.data || []);
        setCurrentUser(user);

        const batchIdFromUrl = searchParams.get("batchId");
        if (batchIdFromUrl && batchList.length > 0) {
          const foundBatch = batchList.find((b) => b.id === batchIdFromUrl);
          if (foundBatch) {
            setSelectedBatch(foundBatch);
            fetchInventoryData(foundBatch.id);
          }
        }
      } catch (error) {
        console.error("Init data error", error);
      } finally {
        setInitializing(false);
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredInventory = useMemo(() => {
    if (!searchTerm) return inventory;
    const keyword = searchTerm.toLowerCase();

    return inventory.filter((row) => {
      const matchProduct = row.productBatch?.product?.name
        ?.toLowerCase()
        .includes(keyword);
      const matchBatch = row.productBatch?.batchNo?.toLowerCase().includes(keyword);
      const matchLocation = row.location?.name?.toLowerCase().includes(keyword);
      return matchProduct || matchBatch || matchLocation;
    });
  }, [inventory, searchTerm]);

  const filteredMovements = useMemo(() => {
    if (!searchTerm) return movements;
    const keyword = searchTerm.toLowerCase();
    return movements.filter((row) => {
      const matchType = row.movementType?.toLowerCase().includes(keyword);
      const matchFrom = row.fromLocation?.name?.toLowerCase().includes(keyword);
      const matchTo = row.toLocation?.name?.toLowerCase().includes(keyword);
      return matchType || matchFrom || matchTo;
    });
  }, [movements, searchTerm]);

  const handleSearch = () => {
    if (!selectedBatch) return;
    setSearchParams({ batchId: selectedBatch.id });
    fetchInventoryData(selectedBatch.id);
  };

  const handleReset = () => {
    setSelectedBatch(null);
    setInventory([]);
    setMovements([]);
    setSearchTerm("");
    setSearchParams({});
  };

  const handleOpenAction = (type, row) => {
    setMovementType(type);
    setSelectedRow(row);
    setOpenMovement(true);
  };

  const handleSubmitAction = async (preparedData) => {
    const finalPayload = {
      productBatchId: selectedBatch.id,
      createdById: currentUser?.userId,
      idempotencyKey: `${movementType}-${Date.now()}`,
      ...preparedData,
    };
    await (movementType === "transfer"
      ? InventoryService.transfer(finalPayload)
      : InventoryService.adjust(finalPayload));
    setOpenMovement(false);
    fetchInventoryData(selectedBatch.id);
  };

  const searchPlaceholder = useMemo(() => {
    if (tab === 0) {
      return "Search by product, batch, location...";
    }
    return "Search by type (e.g Transfer), from/to location...";
  }, [tab]);

  if (initializing) {
    return (
      <Box sx={{ p: 5, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 3 }}>
      {/* SECTION 1: SEARCH HEADER */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
        }}
      >
        <Stack spacing={3}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "#eef2ff", color: "#3E468A" }}>
              <Inventory2OutlinedIcon />
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 650, color: "#1e293b", lineHeight: 1.2, mb: 0.5 }}
              >
                Inventory Stock Check
              </Typography>
              <Typography variant="body1">
                Select a product batch to view stock levels.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Autocomplete
                options={batches}
                getOptionLabel={(opt) =>
                  `${opt.batchNo} - ${opt.product?.name || "Unknown"}`
                }
                value={selectedBatch}
                onChange={(_, val) => setSelectedBatch(val)}
                renderInput={(p) => (
                  <TextField
                    {...p}
                    label="Search by Batch / Product Name"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />
            </Box>

            <Stack
              direction="row"
              spacing={1}
              sx={{ width: { xs: "100%", md: "auto" }, minWidth: { md: "300px" } }}
            >
              <Button
                variant="contained"
                fullWidth
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                disabled={!selectedBatch || loading}
                sx={{
                  flex: 2,
                  bgcolor: "#3E468A",
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: "none",
                  height: "56px",
                  boxShadow: "none",
                  fontSize: "15px",
                }}
              >
                Check Stock
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  textTransform: "none",
                  color: "#64748b",
                  borderColor: "#cbd5e1",
                  height: "56px",
                  fontSize: "15px",
                }}
              >
                Reset
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Fade in={true}>
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, v) => {
                setTab(v);
                setSearchTerm("");
              }}
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 550,
                  fontSize: "0.9rem",
                  minHeight: 40,
                  mr: 2,
                  px: 0,
                },
                "& .MuiTabs-indicator": { borderRadius: 1 },
              }}
            >
              <Tab label={`INVENTORY (${filteredInventory.length})`} />
              <Tab label={`HISTORY (${filteredMovements.length})`} />
            </Tabs>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <SearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                placeholder={searchPlaceholder}
                sx={{ width: 350, bgcolor: "white" }}
              />
              <ActionButtons
                onExport={() => console.log("Exporting...")}
                onPrint={() => window.print()}
              />
            </Box>
          </Box>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              overflow: "hidden",
            }}
          >
            <Box sx={{ position: "relative", minHeight: loading ? 200 : "auto" }}>
              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 200,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {tab === 0 && (
                    <DataTable
                      columns={getInventoryColumns(handleOpenAction)}
                      data={filteredInventory.map((item, i) => ({
                        ...item,
                        id: item.id || `inv-${i}`,
                      }))}
                    />
                  )}
                  {tab === 1 && (
                    <DataTable
                      columns={movementColumns}
                      data={filteredMovements.map((m, i) => ({
                        ...m,
                        id: m.id || `mov-${i}`,
                      }))}
                    />
                  )}
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </Fade>

      <MovementDialog
        open={openMovement}
        type={movementType}
        locations={locations}
        selectedInventory={selectedRow}
        onClose={() => setOpenMovement(false)}
        onSubmit={handleSubmitAction}
      />
    </Box>
  );
};

export default Inventory;
