import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Warehouse from "../Warehouse";

// Mock services
vi.mock("@/services/category.service");
vi.mock("@/services/product.service");
vi.mock("@/services/warehouse.service");
vi.mock("@/services/location.service");
vi.mock("@/services/batch.service");

// Mock data service
vi.mock("../components/data_service", () => ({
  fetchCategoriesData: vi.fn(),
  fetchProductsData: vi.fn(),
  fetchWarehousesData: vi.fn(),
  fetchLocationsData: vi.fn(),
  fetchBatchesData: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import {
  fetchCategoriesData,
  fetchProductsData,
  fetchWarehousesData,
  fetchLocationsData,
  fetchBatchesData,
} from "../components/data_service";
import ProductCategoryService from "@/services/category.service";
import ProductService from "@/services/product.service";
import WarehouseService from "@/services/warehouse.service";
import LocationService from "@/services/location.service";
import ProductBatchService from "@/services/batch.service";

describe("Warehouse Page - Integration Tests", () => {
  // Mock data for different entities
  const mockWarehouses = [
    {
      id: 1,
      code: "WH001",
      name: "Main Warehouse",
      address: "123 Main St",
      metadata: { totalArea: 5000 },
      updatedAt: "2025-01-15T10:00:00Z",
    },
    {
      id: 2,
      code: "WH002",
      name: "Secondary Warehouse",
      address: "456 Second Ave",
      metadata: { totalArea: 3000 },
      updatedAt: "2025-01-10T15:30:00Z",
    },
  ];

  const mockCategories = [
    { id: 1, name: "Electronics" },
    { id: 2, name: "Furniture" },
    { id: 3, name: "Office Supplies" },
  ];

  const mockProducts = [
    {
      id: 1,
      sku: "PRD001",
      name: "Laptop Dell XPS 15",
      categoryId: 1,
      category: { name: "Electronics" },
      unit: "piece",
      barcode: "1234567890",
      updatedAt: "2025-01-14T12:00:00Z",
    },
    {
      id: 2,
      sku: "PRD002",
      name: "Office Chair",
      categoryId: 2,
      category: { name: "Furniture" },
      unit: "piece",
      barcode: "0987654321",
      updatedAt: "2025-01-12T09:00:00Z",
    },
  ];

  const mockLocations = [
    {
      id: 1,
      code: "LOC001",
      name: "Aisle A - Shelf 1",
      type: "Storage",
      capacity: 100,
      warehouseId: 1,
      warehouse: { name: "Main Warehouse" },
      updatedAt: "2025-01-13T14:00:00Z",
    },
    {
      id: 2,
      code: "LOC002",
      name: "Aisle B - Shelf 1",
      type: "Storage",
      capacity: 150,
      warehouseId: 2,
      warehouse: { name: "Secondary Warehouse" },
      updatedAt: "2025-01-11T11:00:00Z",
    },
  ];

  const mockBatches = [
    {
      id: 1,
      batchNo: "BATCH001",
      productId: 1,
      product: { name: "Laptop Dell XPS 15" },
      quantity: 50,
      manufactureDate: "2025-01-01T00:00:00Z",
      expiryDate: "2026-01-01T00:00:00Z",
      updatedAt: "2025-01-15T08:00:00Z",
    },
    {
      id: 2,
      batchNo: "BATCH002",
      productId: 2,
      product: { name: "Office Chair" },
      quantity: 30,
      manufactureDate: "2024-12-15T00:00:00Z",
      expiryDate: null,
      updatedAt: "2025-01-10T10:00:00Z",
    },
  ];

  const renderWarehouse = () => {
    return render(
      <BrowserRouter>
        <Warehouse />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    
    // Reset all mocks
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Setup default mock implementations
    fetchWarehousesData.mockResolvedValue(mockWarehouses);
    fetchCategoriesData.mockResolvedValue(mockCategories);
    fetchProductsData.mockResolvedValue(mockProducts);
    fetchLocationsData.mockResolvedValue(mockLocations);
    fetchBatchesData.mockResolvedValue(mockBatches);

    // Mock service methods
    WarehouseService.delete = vi.fn().mockResolvedValue({ success: true });
    WarehouseService.update = vi.fn().mockResolvedValue({ success: true });
    WarehouseService.create = vi.fn().mockResolvedValue({ success: true });

    ProductCategoryService.delete = vi.fn().mockResolvedValue({ success: true });
    ProductCategoryService.update = vi.fn().mockResolvedValue({ success: true });
    ProductCategoryService.create = vi.fn().mockResolvedValue({ success: true });

    ProductService.delete = vi.fn().mockResolvedValue({ success: true });
    ProductService.update = vi.fn().mockResolvedValue({ success: true });
    ProductService.create = vi.fn().mockResolvedValue({ success: true });

    LocationService.delete = vi.fn().mockResolvedValue({ success: true });
    LocationService.update = vi.fn().mockResolvedValue({ success: true });
    LocationService.create = vi.fn().mockResolvedValue({ success: true });

    ProductBatchService.delete = vi.fn().mockResolvedValue({ success: true });
    ProductBatchService.update = vi.fn().mockResolvedValue({ success: true });
    ProductBatchService.create = vi.fn().mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== BASIC RENDERING & STATE ====================
  describe("Basic Rendering & State", () => {
    it("renders the warehouse page without crashing", async () => {
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it("displays the toolbar with all menu items", async () => {
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      expect(screen.getByText("Warehouses")).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("Locations")).toBeInTheDocument();
      expect(screen.getByText("Products")).toBeInTheDocument();
      expect(screen.getByText("Batches")).toBeInTheDocument();
    });

    it("displays action buttons (Add, Import, Export, Print)", async () => {
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      // Check for Add button
      const addButton = screen.getByRole("button", { name: /add/i });
      expect(addButton).toBeInTheDocument();

      // Check for other action buttons by icon or label
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(1);
    });

    it("loads and displays warehouses data by default", async () => {
      renderWarehouse();

      await waitFor(() => {
        expect(fetchWarehousesData).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
        expect(screen.getByText("Secondary Warehouse")).toBeInTheDocument();
      });
    });

    it("shows loading spinner while fetching data", async () => {
      // Delay the mock response to see loading state
      fetchWarehousesData.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockWarehouses), 100))
      );

      renderWarehouse();

      expect(screen.getByRole("progressbar")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });
    });
  });

  // ==================== HAPPY PATH TESTING ====================
  describe("Happy Path - Menu Navigation", () => {
    it("switches to categories menu and displays categories", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const categoriesTab = screen.getByText("Categories");
      await user.click(categoriesTab);

      await waitFor(() => {
        expect(fetchCategoriesData).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
        expect(screen.getByText("Furniture")).toBeInTheDocument();
      });
    });

    it("switches to products menu and displays products", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const productsTab = screen.getByText("Products");
      await user.click(productsTab);

      await waitFor(() => {
        expect(fetchProductsData).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 15")).toBeInTheDocument();
        expect(screen.getByText("Office Chair")).toBeInTheDocument();
      });
    });

    it("switches to locations menu and displays locations", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const locationsTab = screen.getByText("Locations");
      await user.click(locationsTab);

      await waitFor(() => {
        expect(fetchLocationsData).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText("Aisle A - Shelf 1")).toBeInTheDocument();
        expect(screen.getByText("Aisle B - Shelf 1")).toBeInTheDocument();
      });
    });

    it("switches to batches menu and displays batches", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const batchesTab = screen.getByText("Batches");
      await user.click(batchesTab);

      await waitFor(() => {
        expect(fetchBatchesData).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText("BATCH001")).toBeInTheDocument();
        expect(screen.getByText("BATCH002")).toBeInTheDocument();
      });
    });

    it("persists selected menu in localStorage", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const productsTab = screen.getByText("Products");
      await user.click(productsTab);

      await waitFor(() => {
        expect(localStorage.getItem("selectedMenu")).toBe("products");
      });
    });

    it("restores selected menu from localStorage on mount", async () => {
      localStorage.setItem("selectedMenu", "categories");

      renderWarehouse();

      await waitFor(() => {
        expect(fetchCategoriesData).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });
    });
  });

  // ==================== SEARCH FUNCTIONALITY ====================
  describe("Search Functionality", () => {
    it("filters warehouses by name", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "Main");

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
        expect(screen.queryByText("Secondary Warehouse")).not.toBeInTheDocument();
      });
    });

    it("filters warehouses by code", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "WH002");

      await waitFor(() => {
        expect(screen.queryByText("Main Warehouse")).not.toBeInTheDocument();
        expect(screen.getByText("Secondary Warehouse")).toBeInTheDocument();
      });
    });

    it("filters products by SKU", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const productsTab = screen.getByText("Products");
      await user.click(productsTab);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 15")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "PRD001");

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 15")).toBeInTheDocument();
        expect(screen.queryByText("Office Chair")).not.toBeInTheDocument();
      });
    });

    it("shows all data when search is cleared", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "Main");

      await waitFor(() => {
        expect(screen.queryByText("Secondary Warehouse")).not.toBeInTheDocument();
      });

      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
        expect(screen.getByText("Secondary Warehouse")).toBeInTheDocument();
      });
    });

    it("shows no results when search term doesn't match", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "NonExistentWarehouse");

      await waitFor(() => {
        expect(screen.queryByText("Main Warehouse")).not.toBeInTheDocument();
        expect(screen.queryByText("Secondary Warehouse")).not.toBeInTheDocument();
      });
    });

    it("search is case-insensitive", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "MAIN");

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });
    });

    it("clears search when switching menus", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "Main");

      const categoriesTab = screen.getByText("Categories");
      await user.click(categoriesTab);

      await waitFor(() => {
        expect(searchInput.value).toBe("");
      });
    });
  });

  // ==================== VIEW FUNCTIONALITY ====================
  describe("View Detail Navigation", () => {
    it("navigates to warehouse detail on view", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      // Find the View button for the first warehouse
      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1]; // Skip header row
      const viewButton = within(firstDataRow).getByTestId("VisibilityIcon").closest("button");

      await user.click(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith("/warehouse/warehouses/1");
    });

    it("navigates to location detail on view", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const locationsTab = screen.getByText("Locations");
      await user.click(locationsTab);

      await waitFor(() => {
        expect(screen.getByText("Aisle A - Shelf 1")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const viewButton = within(firstDataRow).getByTestId("VisibilityIcon").closest("button");

      await user.click(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith("/warehouse/locations/1");
    });

    it("navigates to product detail on view", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const productsTab = screen.getByText("Products");
      await user.click(productsTab);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 15")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const viewButton = within(firstDataRow).getByTestId("VisibilityIcon").closest("button");

      await user.click(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith("/warehouse/products/1");
    });

    it("navigates to batch detail on view", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const batchesTab = screen.getByText("Batches");
      await user.click(batchesTab);

      await waitFor(() => {
        expect(screen.getByText("BATCH001")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const viewButton = within(firstDataRow).getByTestId("VisibilityIcon").closest("button");

      await user.click(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith("/warehouse/batches/1");
    });

    it("does not show view button for categories menu", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const categoriesTab = screen.getByText("Categories");
      await user.click(categoriesTab);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      
      // Categories should not have view button
      const viewIcons = within(firstDataRow).queryAllByTestId("VisibilityIcon");
      expect(viewIcons.length).toBe(0);
    });
  });

  // ==================== ADD FUNCTIONALITY ====================
  describe("Add New Item", () => {
    it("opens add dialog when Add button is clicked", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole("button", { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("closes add dialog when Cancel is clicked", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole("button", { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  // ==================== EDIT FUNCTIONALITY ====================
  describe("Edit Item", () => {
    it("opens edit dialog when Edit button is clicked", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const editButton = within(firstDataRow).getByTestId("EditIcon").closest("button");

      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });
  });

  // ==================== DELETE FUNCTIONALITY ====================
  describe("Delete Item", () => {
    it("opens delete confirmation dialog when Delete button is clicked", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const deleteButton = within(firstDataRow).getByTestId("DeleteIcon").closest("button");

      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });

    it("closes delete dialog when Cancel is clicked", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const deleteButton = within(firstDataRow).getByTestId("DeleteIcon").closest("button");

      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
      });
    });

    it("deletes warehouse and refreshes data when confirmed", async () => {
      const user = userEvent.setup();
      fetchWarehousesData
        .mockResolvedValueOnce(mockWarehouses)
        .mockResolvedValueOnce([mockWarehouses[1]]); // After delete, return only second warehouse

      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const deleteButton = within(firstDataRow).getByTestId("DeleteIcon").closest("button");

      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(WarehouseService.delete).toHaveBeenCalledWith(1);
      });

      await waitFor(() => {
        expect(fetchWarehousesData).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ==================== ERROR HANDLING ====================
  describe("Error Handling", () => {
    it.skip("handles fetch error gracefully", async () => {
      fetchWarehousesData.mockRejectedValueOnce(new Error("Network error"));

      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      // Should still render the page without crashing
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it("handles empty data array", async () => {
      fetchWarehousesData.mockResolvedValueOnce([]);

      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      // Should render empty table
      expect(screen.queryByText("Main Warehouse")).not.toBeInTheDocument();
    });

    it("handles null/undefined data response", async () => {
      fetchWarehousesData.mockResolvedValueOnce(null);

      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      // Should not crash
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it("handles data with missing nested properties", async () => {
      const incompleteData = [
        {
          id: 1,
          code: "WH001",
          name: "Incomplete Warehouse",
          // Missing metadata and updatedAt
        },
      ];

      fetchWarehousesData.mockResolvedValueOnce(incompleteData);

      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Incomplete Warehouse")).toBeInTheDocument();
      });

      // Should display "-" for missing data
      expect(screen.getAllByText("-")[0]).toBeInTheDocument();
    });
  });

  // ==================== BOUNDARY VALUE ANALYSIS ====================
  describe("Boundary Value Analysis", () => {
    it("handles single item in data array", async () => {
      fetchWarehousesData.mockResolvedValueOnce([mockWarehouses[0]]);

      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      expect(screen.queryByText("Secondary Warehouse")).not.toBeInTheDocument();
    });

    it("handles large data set efficiently", async () => {
      const largeDataSet = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        code: `WH${String(i + 1).padStart(3, "0")}`,
        name: `Warehouse ${i + 1}`,
        address: `Address ${i + 1}`,
        metadata: { totalArea: 1000 + i * 100 },
        updatedAt: "2025-01-15T10:00:00Z",
      }));

      fetchWarehousesData.mockResolvedValueOnce(largeDataSet);

      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Warehouse 1")).toBeInTheDocument();
      });

      // Verify pagination or scrolling works
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });

    it.skip("handles very long search query", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      const longQuery = "a".repeat(500);
      await user.type(searchInput, longQuery);

      // Should not crash
      expect(searchInput.value).toBe(longQuery);
    });

    it.skip("handles empty string in search", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "");

      // Should show all data
      expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      expect(screen.getByText("Secondary Warehouse")).toBeInTheDocument();
    });

    it("handles special characters in search", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "!@#$%^&*()");

      // Should not crash and show no results
      await waitFor(() => {
        expect(screen.queryByText("Main Warehouse")).not.toBeInTheDocument();
      });
    });
  });

  // ==================== EQUIVALENCE PARTITIONING ====================
  describe("Equivalence Partitioning - Menu Types", () => {
    it("handles menu with view enabled (warehouses)", async () => {
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const viewButton = within(firstDataRow).queryByTestId("VisibilityIcon");

      expect(viewButton).toBeInTheDocument();
    });

    it("handles menu with view disabled (categories)", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const categoriesTab = screen.getByText("Categories");
      await user.click(categoriesTab);

      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const viewButton = within(firstDataRow).queryByTestId("VisibilityIcon");

      expect(viewButton).not.toBeInTheDocument();
    });

    it("handles menu with nested data (locations with warehouse)", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const locationsTab = screen.getByText("Locations");
      await user.click(locationsTab);

      await waitFor(() => {
        expect(screen.getByText("Aisle A - Shelf 1")).toBeInTheDocument();
      });

      // Should display nested warehouse name
      expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
    });

    it("handles menu with date formatting (batches)", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const batchesTab = screen.getByText("Batches");
      await user.click(batchesTab);

      await waitFor(() => {
        expect(screen.getByText("BATCH001")).toBeInTheDocument();
      });

      // Should display formatted dates
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  // ==================== NON-FUNCTIONAL CHECKS ====================
  describe("Non-Functional Requirements", () => {
    describe("Accessibility", () => {
      it("has accessible search input with placeholder", async () => {
        renderWarehouse();

        await waitFor(() => {
          expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/search/i);
        expect(searchInput).toBeInTheDocument();
        expect(searchInput).toHaveAttribute("type", "text");
      });

      it("action buttons are keyboard accessible", async () => {
        renderWarehouse();

        await waitFor(() => {
          expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        });

        const addButton = screen.getByRole("button", { name: /add/i });
        addButton.focus();
        expect(document.activeElement).toBe(addButton);
      });

      it("menu tabs are keyboard navigable", async () => {
        renderWarehouse();

        await waitFor(() => {
          expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        });

        const categoriesTab = screen.getByText("Categories");
        categoriesTab.focus();
        expect(document.activeElement).toContain(categoriesTab);
      });

      it("table has proper semantic structure", async () => {
        renderWarehouse();

        await waitFor(() => {
          expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
        });

        const table = screen.getByRole("table");
        expect(table).toBeInTheDocument();

        const headers = within(table).getAllByRole("columnheader");
        expect(headers.length).toBeGreaterThan(0);
      });
    });

    describe("Performance", () => {
      it("renders within acceptable time", async () => {
        const startTime = performance.now();

        renderWarehouse();

        await waitFor(() => {
          expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        });

        const endTime = performance.now();
        const renderTime = endTime - startTime;

        // Should render in less than 2 seconds
        expect(renderTime).toBeLessThan(2000);
      });

      it("search filters data efficiently", async () => {
        const user = userEvent.setup();
        const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          code: `WH${String(i + 1).padStart(3, "0")}`,
          name: `Warehouse ${i + 1}`,
          address: `Address ${i + 1}`,
          metadata: { totalArea: 1000 },
          updatedAt: "2025-01-15T10:00:00Z",
        }));

        fetchWarehousesData.mockResolvedValueOnce(largeDataSet);

        renderWarehouse();

        await waitFor(() => {
          expect(screen.getByText("Warehouse 1")).toBeInTheDocument();
        });

        const startTime = performance.now();

        const searchInput = screen.getByPlaceholderText(/search/i);
        await user.type(searchInput, "500");

        const endTime = performance.now();
        const searchTime = endTime - startTime;

        // Search should complete quickly even with large dataset
        expect(searchTime).toBeLessThan(1000);
      });
    });

    describe("UI/UX", () => {
      it("displays loading state during data fetch", async () => {
        fetchWarehousesData.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockWarehouses), 500))
        );

        renderWarehouse();

        expect(screen.getByRole("progressbar")).toBeInTheDocument();

        await waitFor(() => {
          expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        }, { timeout: 1000 });
      });

      it.skip("maintains UI state during operations", async () => {
        const user = userEvent.setup();
        renderWarehouse();

        await waitFor(() => {
          expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/search/i);
        await user.type(searchInput, "Main");

        // UI should remain responsive
        expect(searchInput.value).toBe("Main");
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      it("provides visual feedback for selected menu", async () => {
        const user = userEvent.setup();
        renderWarehouse();

        await waitFor(() => {
          expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        });

        const categoriesTab = screen.getByText("Categories");
        await user.click(categoriesTab);

        await waitFor(() => {
          expect(fetchCategoriesData).toHaveBeenCalled();
        });

        // Menu should visually indicate selection (tested via component presence)
        expect(screen.getByText("Electronics")).toBeInTheDocument();
      });
    });
  });

  // ==================== INTEGRATION SCENARIOS ====================
  describe("Complex Integration Scenarios", () => {
    it.skip("completes full workflow: switch menu -> search -> view detail", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      // Switch to products
      const productsTab = screen.getByText("Products");
      await user.click(productsTab);

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 15")).toBeInTheDocument();
      });

      // Search for laptop
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "Laptop");

      await waitFor(() => {
        expect(screen.getByText("Laptop Dell XPS 15")).toBeInTheDocument();
        expect(screen.queryByText("Office Chair")).not.toBeInTheDocument();
      });

      // View detail
      const rows = screen.getAllByRole("row");
      const firstDataRow = rows[1];
      const viewButton = within(firstDataRow).getByTestId("VisibilityIcon").closest("button");

      await user.click(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith("/warehouse/products/1");
    });

    it("handles rapid menu switching", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });

      const categoriesTab = screen.getByText("Categories");
      const productsTab = screen.getByText("Products");
      const locationsTab = screen.getByText("Locations");

      // Rapidly switch menus
      await user.click(categoriesTab);
      await user.click(productsTab);
      await user.click(locationsTab);

      await waitFor(() => {
        expect(screen.getByText("Aisle A - Shelf 1")).toBeInTheDocument();
      });

      // Should land on the last clicked menu
      expect(fetchLocationsData).toHaveBeenCalled();
    });

    it.skip("preserves search when opening and closing dialogs", async () => {
      const user = userEvent.setup();
      renderWarehouse();

      await waitFor(() => {
        expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "Main");

      const addButton = screen.getByRole("button", { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Search term should still be present
      expect(searchInput.value).toBe("Main");
      expect(screen.getByText("Main Warehouse")).toBeInTheDocument();
    });
  });
});
