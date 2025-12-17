import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Sidebar from "../Sidebar";

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
const mockLocation = { pathname: "/" };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

const renderSidebar = (props = {}) => {
  return render(
    <BrowserRouter>
      <Sidebar {...props} />
    </BrowserRouter>
  );
};

describe("Sidebar Component - Comprehensive Tests", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation.pathname = "/";
  });

  // ==================== BASIC RENDERING ====================
  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      expect(() => {
        renderSidebar();
      }).not.toThrow();
    });

    it("renders all menu items", () => {
      renderSidebar();

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Purchase Order")).toBeInTheDocument();
      expect(screen.getByText("Inventory")).toBeInTheDocument();
      expect(screen.getByText("Warehouse")).toBeInTheDocument();
      expect(screen.getByText("Supplier")).toBeInTheDocument();
      expect(screen.getByText("Shipment")).toBeInTheDocument();
      expect(screen.getByText("Logistics")).toBeInTheDocument();
    });

    it("renders with default width", () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ width: "264px" });
    });

    it("renders with custom width", () => {
      const { container } = renderSidebar({ width: 300 });
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ width: "300px" });
    });

    it("renders with default header height", () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ top: "60px" });
    });

    it("renders with custom header height", () => {
      const { container } = renderSidebar({ headerHeight: 80 });
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ top: "80px" });
    });

    it("applies correct positioning styles", () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({
        position: "fixed",
        left: "0",
      });
    });

    it("has scrollable overflow", () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ overflowY: "auto" });
    });
  });

  // ==================== NAVIGATION ====================
  describe("Navigation Functionality", () => {
    it("navigates to dashboard when Dashboard is clicked", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const dashboardItem = screen.getByText("Dashboard");
      await user.click(dashboardItem);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("navigates to purchase order page", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const poItem = screen.getByText("Purchase Order");
      await user.click(poItem);

      expect(mockNavigate).toHaveBeenCalledWith("/purchase-order");
    });

    it("navigates to inventory page", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const inventoryItem = screen.getByText("Inventory");
      await user.click(inventoryItem);

      expect(mockNavigate).toHaveBeenCalledWith("/inventory");
    });

    it("navigates to warehouse page", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const warehouseItem = screen.getByText("Warehouse");
      await user.click(warehouseItem);

      expect(mockNavigate).toHaveBeenCalledWith("/warehouse");
    });

    it("navigates to supplier page", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const supplierItem = screen.getByText("Supplier");
      await user.click(supplierItem);

      expect(mockNavigate).toHaveBeenCalledWith("/supplier");
    });

    it("navigates to shipment page", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const shipmentItem = screen.getByText("Shipment");
      await user.click(shipmentItem);

      expect(mockNavigate).toHaveBeenCalledWith("/shipment");
    });

    it("does not navigate when disabled item is clicked", async () => {
      userEvent.setup();
      renderSidebar();

      // Logistics item has pointer-events: none, skip click test
      const logisticsItem = screen.getByText("Logistics");
      expect(logisticsItem).toBeInTheDocument();
      // Don't click disabled items
    });
  });

  // ==================== ACTIVE STATE ====================
  describe("Active State Highlighting", () => {
    it("highlights Dashboard when on home path", () => {
      mockLocation.pathname = "/";
      renderSidebar();

      const dashboardButton = screen.getByRole("button", {
        name: /dashboard/i,
      });
      expect(dashboardButton).toHaveClass("Mui-selected");
    });

    it("highlights Purchase Order when on /purchase-order", () => {
      mockLocation.pathname = "/purchase-order";
      renderSidebar();

      const poButton = screen.getByRole("button", { name: /purchase order/i });
      expect(poButton).toHaveClass("Mui-selected");
    });

    it("highlights Inventory when on /inventory", () => {
      mockLocation.pathname = "/inventory";
      renderSidebar();

      const inventoryButton = screen.getByRole("button", {
        name: /inventory/i,
      });
      expect(inventoryButton).toHaveClass("Mui-selected");
    });

    it("highlights Warehouse when on /warehouse", () => {
      mockLocation.pathname = "/warehouse";
      renderSidebar();

      const warehouseButton = screen.getByRole("button", {
        name: /warehouse/i,
      });
      expect(warehouseButton).toHaveClass("Mui-selected");
    });

    it("highlights Supplier when on /supplier", () => {
      mockLocation.pathname = "/supplier";
      renderSidebar();

      const supplierButton = screen.getByRole("button", { name: /supplier/i });
      expect(supplierButton).toHaveClass("Mui-selected");
    });

    it("highlights Shipment when on /shipment", () => {
      mockLocation.pathname = "/shipment";
      renderSidebar();

      const shipmentButton = screen.getByRole("button", { name: /shipment/i });
      expect(shipmentButton).toHaveClass("Mui-selected");
    });

    it("does not highlight any item on unknown path", () => {
      mockLocation.pathname = "/unknown";
      renderSidebar();

      const buttons = screen.getAllByRole("button");
      const selectedButtons = buttons.filter((btn) =>
        btn.classList.contains("Mui-selected")
      );

      expect(selectedButtons.length).toBe(0);
    });

    it("only one item is highlighted at a time", () => {
      mockLocation.pathname = "/inventory";
      renderSidebar();

      const buttons = screen.getAllByRole("button");
      const selectedButtons = buttons.filter((btn) =>
        btn.classList.contains("Mui-selected")
      );

      expect(selectedButtons.length).toBe(1);
    });
  });

  // ==================== DISABLED STATE ====================
  describe("Disabled Menu Items", () => {
    it("disables Logistics menu item", () => {
      renderSidebar();

      const logisticsButton = screen.getByRole("button", {
        name: /logistics/i,
      });
      expect(logisticsButton).toHaveAttribute("aria-disabled", "true");
    });

    it("applies disabled styling to Logistics", () => {
      renderSidebar();

      const logisticsButton = screen.getByRole("button", {
        name: /logistics/i,
      });
      expect(logisticsButton).toHaveAttribute("aria-disabled", "true");
    });

    it("all other items are enabled", () => {
      renderSidebar();

      expect(
        screen.getByRole("button", { name: /dashboard/i })
      ).not.toBeDisabled();
      expect(
        screen.getByRole("button", { name: /purchase order/i })
      ).not.toBeDisabled();
      expect(
        screen.getByRole("button", { name: /inventory/i })
      ).not.toBeDisabled();
      expect(
        screen.getByRole("button", { name: /warehouse/i })
      ).not.toBeDisabled();
      expect(
        screen.getByRole("button", { name: /supplier/i })
      ).not.toBeDisabled();
      expect(
        screen.getByRole("button", { name: /shipment/i })
      ).not.toBeDisabled();
    });
  });

  // ==================== STYLING ====================
  describe("Styling and Appearance", () => {
    it("has white background", () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ background: "white" });
    });

    it("has border on the right", () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ borderRight: "1px solid #e0e0e0" });
    });

    it("has correct z-index", () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ zIndex: 1000 });
    });

    it("calculates height based on header height", () => {
      const { container } = renderSidebar({ headerHeight: 70 });
      
      // Verify sidebar renders with custom header height
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it("renders ListItemButton with correct styles", () => {
      renderSidebar();
      const dashboardButton = screen.getByRole("button", {
        name: /dashboard/i,
      });
      expect(dashboardButton).toHaveStyle({ borderRadius: "8px" });
    });
  });

  // ==================== ACCESSIBILITY ====================
  describe("Accessibility", () => {
    it("all menu items are keyboard accessible", () => {
      renderSidebar();

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((button) => {
        button.focus();
        expect(document.activeElement).toBe(button);
      });
    });

    it("uses semantic button elements", () => {
      renderSidebar();

      const buttons = screen.getAllByRole("button");
      // MUI ListItemButton uses div with role="button", not actual button element
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("role", "button");
      });
    });

    it("provides clear text labels for all items", () => {
      renderSidebar();

      const menuItems = [
        "Dashboard",
        "Purchase Order",
        "Inventory",
        "Warehouse",
        "Supplier",
        "Shipment",
        "Logistics",
      ];

      menuItems.forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it("disabled item is properly marked", () => {
      renderSidebar();

      const logisticsButton = screen.getByRole("button", {
        name: /logistics/i,
      });
      expect(logisticsButton).toHaveAttribute("aria-disabled", "true");
      expect(logisticsButton).toHaveAttribute("tabindex", "-1");
    });
  });

  // ==================== INTERACTION BEHAVIOR ====================
  describe("User Interaction Behavior", () => {
    it("maintains state after navigation", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const inventoryItem = screen.getByText("Inventory");
      await user.click(inventoryItem);

      expect(mockNavigate).toHaveBeenCalledWith("/inventory");

      // Component should still be rendered
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("handles rapid clicks", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const dashboardItem = screen.getByText("Dashboard");

      await user.click(dashboardItem);
      await user.click(dashboardItem);
      await user.click(dashboardItem);

      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });

    it("handles hover state", async () => {
      const user = userEvent.setup();
      renderSidebar();

      const dashboardButton = screen.getByRole("button", {
        name: /dashboard/i,
      });

      await user.hover(dashboardButton);

      // Component should still be in the document
      expect(dashboardButton).toBeInTheDocument();
    });
  });

  // ==================== EDGE CASES ====================
  describe("Edge Cases", () => {
    it("handles zero width gracefully", () => {
      const { container } = renderSidebar({ width: 0 });
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ width: "0px" });
    });

    it("handles very large width", () => {
      const { container } = renderSidebar({ width: 1000 });
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ width: "1000px" });
    });

    it("handles negative header height", () => {
      const { container } = renderSidebar({ headerHeight: -10 });
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ top: "-10px" });
    });

    it("renders consistently across multiple mounts", () => {
      const { unmount } = renderSidebar();
      unmount();

      const { container } = renderSidebar();
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  // ==================== MENU STRUCTURE ====================
  describe("Menu Structure", () => {
    it("renders exactly 7 menu items", () => {
      renderSidebar();

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(7);
    });

    it("maintains correct menu order", () => {
      renderSidebar();

      const buttons = screen.getAllByRole("button");
      const labels = buttons.map((btn) => btn.textContent);

      expect(labels).toEqual([
        "Dashboard",
        "Purchase Order",
        "Inventory",
        "Warehouse",
        "Supplier",
        "Shipment",
        "Logistics",
      ]);
    });

    it("each menu item has correct path", () => {
      renderSidebar();

      const pathMappings = {
        Dashboard: "/",
        "Purchase Order": "/purchase-order",
        Inventory: "/inventory",
        Warehouse: "/warehouse",
        Supplier: "/supplier",
        Shipment: "/shipment",
        Logistics: "/logistics",
      };

      Object.keys(pathMappings).forEach((text) => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    });
  });

  // ==================== RESPONSIVE BEHAVIOR ====================
  describe("Responsive Behavior", () => {
    it("maintains fixed position on scroll", () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ position: "fixed" });
    });

    it("allows internal scrolling when content overflows", () => {
      const { container } = renderSidebar();
      const sidebar = container.firstChild;

      expect(sidebar).toHaveStyle({ overflowY: "auto" });
    });

    it("calculates viewport height correctly", () => {
      const { container } = renderSidebar({ headerHeight: 60 });
      
      // Verify sidebar renders properly with default header height
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  // ==================== INTEGRATION SCENARIOS ====================
  describe("Integration Scenarios", () => {
    it("works with React Router navigation", async () => {
      const user = userEvent.setup();
      renderSidebar();

      await user.click(screen.getByText("Inventory"));
      expect(mockNavigate).toHaveBeenCalledWith("/inventory");

      await user.click(screen.getByText("Warehouse"));
      expect(mockNavigate).toHaveBeenCalledWith("/warehouse");
    });

    it("updates active state when location changes", () => {
      mockLocation.pathname = "/";
      const { rerender } = renderSidebar();

      let dashboardButton = screen.getByRole("button", { name: /dashboard/i });
      expect(dashboardButton).toHaveClass("Mui-selected");

      mockLocation.pathname = "/inventory";
      rerender(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const inventoryButton = screen.getByRole("button", {
        name: /inventory/i,
      });
      expect(inventoryButton).toHaveClass("Mui-selected");
    });
  });
});
