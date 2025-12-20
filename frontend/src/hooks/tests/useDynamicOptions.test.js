import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDynamicOptions } from '../useDynamicOptions';
import ProductCategoryService from '@/services/category.service';
import WarehouseService from '@/services/warehouse.service';
import ProductService from '@/services/product.service';

/**
 * UNIT TEST: useDynamicOptions Custom Hook
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal hook behavior
 * 2. Decision Table Testing - Different menu types and conditions
 * 3. Error Guessing - API failures, invalid data
 * 4. Boundary Value Analysis - Edge cases
 * 5. Equivalence Partitioning - Different selectedMenu types
 */

// Mock the services
vi.mock('@/services/category.service');
vi.mock('@/services/warehouse.service');
vi.mock('@/services/product.service');

describe('useDynamicOptions Hook - Unit Tests', () => {
  // Mock data
  const mockCategories = [
    { id: 'cat-1', name: 'Category 1' },
    { id: 'cat-2', name: 'Category 2' },
    { id: 'cat-3', name: 'Category 3' },
  ];

  const mockWarehouses = [
    { id: 'wh-1', name: 'Warehouse 1' },
    { id: 'wh-2', name: 'Warehouse 2' },
  ];

  const mockProducts = [
    { id: 'prod-1', name: 'Product 1' },
    { id: 'prod-2', name: 'Product 2' },
    { id: 'prod-3', name: 'Product 3' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    ProductCategoryService.getAll = vi.fn().mockResolvedValue({
      data: { data: mockCategories },
    });

    WarehouseService.getAll = vi.fn().mockResolvedValue({
      data: { data: mockWarehouses },
    });

    ProductService.getAll = vi.fn().mockResolvedValue({
      data: { data: mockProducts },
    });
  });

  // Happy Path Testing
  describe('Happy Path - Normal Hook Behavior', () => {
    it('should return empty options and null initialValue when not open', () => {
      const { result } = renderHook(() => 
        useDynamicOptions('products', false, null)
      );

      expect(result.current.options).toEqual([]);
      expect(result.current.initialValue).toBeNull();
    });

    it('should load and format product categories when menu is "products" and open', async () => {
      const { result } = renderHook(() => 
        useDynamicOptions('products', true, null)
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });

      expect(result.current.options).toEqual([
        { label: 'Category 1', value: 'cat-1' },
        { label: 'Category 2', value: 'cat-2' },
        { label: 'Category 3', value: 'cat-3' },
      ]);

      expect(ProductCategoryService.getAll).toHaveBeenCalledOnce();
    });

    it('should load and format warehouses when menu is "locations" and open', async () => {
      const { result } = renderHook(() => 
        useDynamicOptions('locations', true, null)
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(2);
      });

      expect(result.current.options).toEqual([
        { label: 'Warehouse 1', value: 'wh-1' },
        { label: 'Warehouse 2', value: 'wh-2' },
      ]);

      expect(WarehouseService.getAll).toHaveBeenCalledOnce();
    });

    it('should load and format products when menu is "batches" and open', async () => {
      const { result } = renderHook(() => 
        useDynamicOptions('batches', true, null)
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });

      expect(result.current.options).toEqual([
        { label: 'Product 1', value: 'prod-1' },
        { label: 'Product 2', value: 'prod-2' },
        { label: 'Product 3', value: 'prod-3' },
      ]);

      expect(ProductService.getAll).toHaveBeenCalledOnce();
    });

    it('should set initialValue when selectedRow has nested data for products', async () => {
      const selectedRow = {
        category: { id: 'cat-2', name: 'Category 2' },
      };

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, selectedRow)
      );

      await waitFor(() => {
        expect(result.current.initialValue).toEqual({ categoryId: 'cat-2' });
      });
    });

    it('should set initialValue when selectedRow has nested data for locations', async () => {
      const selectedRow = {
        warehouse: { id: 'wh-1', name: 'Warehouse 1' },
      };

      const { result } = renderHook(() => 
        useDynamicOptions('locations', true, selectedRow)
      );

      await waitFor(() => {
        expect(result.current.initialValue).toEqual({ warehouseId: 'wh-1' });
      });
    });

    it('should set initialValue when selectedRow has nested data for batches', async () => {
      const selectedRow = {
        product: { id: 'prod-3', name: 'Product 3' },
      };

      const { result } = renderHook(() => 
        useDynamicOptions('batches', true, selectedRow)
      );

      await waitFor(() => {
        expect(result.current.initialValue).toEqual({ productId: 'prod-3' });
      });
    });
  });

  // Decision Table Testing - Different Conditions
  describe('Decision Table - Conditional Loading', () => {
    it('should NOT load data when isOpen is false', async () => {
      const { result } = renderHook(() => 
        useDynamicOptions('products', false, null)
      );

      // Wait a bit to ensure no API call
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ProductCategoryService.getAll).not.toHaveBeenCalled();
      expect(result.current.options).toEqual([]);
    });

    it('should NOT load data when selectedMenu is null', async () => {
      const { result } = renderHook(() => 
        useDynamicOptions(null, true, null)
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ProductCategoryService.getAll).not.toHaveBeenCalled();
      expect(result.current.options).toEqual([]);
    });

    it('should NOT load data when selectedMenu is undefined', async () => {
      const { result } = renderHook(() => 
        useDynamicOptions(undefined, true, null)
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.options).toEqual([]);
    });

    it('should NOT load data when selectedMenu is not recognized', async () => {
      const { result } = renderHook(() => 
        useDynamicOptions('invalid-menu', true, null)
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.options).toEqual([]);
    });

    it('should reload data when isOpen changes from false to true', async () => {
      const { result, rerender } = renderHook(
        ({ menu, open }) => useDynamicOptions(menu, open, null),
        { initialProps: { menu: 'products', open: false } }
      );

      expect(result.current.options).toEqual([]);

      // Change isOpen to true
      rerender({ menu: 'products', open: true });

      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });

      expect(ProductCategoryService.getAll).toHaveBeenCalledOnce();
    });

    it('should reload data when selectedMenu changes', async () => {
      const { result, rerender } = renderHook(
        ({ menu }) => useDynamicOptions(menu, true, null),
        { initialProps: { menu: 'products' } }
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });

      // Change to locations
      rerender({ menu: 'locations' });

      await waitFor(() => {
        expect(result.current.options).toHaveLength(2);
      });

      expect(ProductCategoryService.getAll).toHaveBeenCalledOnce();
      expect(WarehouseService.getAll).toHaveBeenCalledOnce();
    });
  });

  // Boundary Value Analysis
  describe('BVA - Edge Cases', () => {
    it('should handle empty API response', async () => {
      ProductCategoryService.getAll = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, null)
      );

      await waitFor(() => {
        expect(result.current.options).toEqual([]);
      });
    });

    it('should handle single item in API response', async () => {
      ProductCategoryService.getAll = vi.fn().mockResolvedValue({
        data: { data: [{ id: 'cat-1', name: 'Single Category' }] },
      });

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, null)
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(1);
      });

      expect(result.current.options[0]).toEqual({
        label: 'Single Category',
        value: 'cat-1',
      });
    });

    it('should handle very large number of items', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `cat-${i}`,
        name: `Category ${i}`,
      }));

      ProductCategoryService.getAll = vi.fn().mockResolvedValue({
        data: { data: largeDataset },
      });

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, null)
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(1000);
      });
    });

    it('should handle selectedRow with no nested data', async () => {
      const selectedRow = { id: 'row-1', name: 'Row 1' };

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, selectedRow)
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });

      expect(result.current.initialValue).toBeNull();
    });

    it('should handle selectedRow with null nested value', async () => {
      const selectedRow = { category: null };

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, selectedRow)
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });

      expect(result.current.initialValue).toBeNull();
    });

    it('should handle selectedRow with nested object missing id', async () => {
      const selectedRow = { category: { name: 'Category Without ID' } };

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, selectedRow)
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });

      expect(result.current.initialValue).toBeNull();
    });
  });

  // Error Guessing - API Failures
  describe('Error Guessing - API Error Handling', () => {
    it('should handle API rejection gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      ProductCategoryService.getAll = vi.fn().mockRejectedValue(
        new Error('API Error')
      );

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, null)
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      expect(result.current.options).toEqual([]);
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle network timeout', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      ProductCategoryService.getAll = vi.fn().mockRejectedValue(
        new Error('timeout of 5000ms exceeded')
      );

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, null)
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      expect(result.current.options).toEqual([]);
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed API response', async () => {
      ProductCategoryService.getAll = vi.fn().mockResolvedValue({
        data: null, // Malformed response
      });

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, null)
      );

      await waitFor(() => {
        expect(result.current.options).toEqual([]);
      });
    });

    it('should handle missing data key in response', async () => {
      ProductCategoryService.getAll = vi.fn().mockResolvedValue({
        data: {},
      });

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, null)
      );

      await waitFor(() => {
        expect(result.current.options).toEqual([]);
      });
    });

    it('should handle items without name property', async () => {
      ProductCategoryService.getAll = vi.fn().mockResolvedValue({
        data: {
          data: [
            { id: 'cat-1' }, // Missing name
            { id: 'cat-2', name: 'Category 2' },
          ],
        },
      });

      const { result } = renderHook(() => 
        useDynamicOptions('products', true, null)
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(2);
      });

      expect(result.current.options[0]).toEqual({
        label: undefined,
        value: 'cat-1',
      });
    });
  });

  // Equivalence Partitioning - Menu Types
  describe('Equivalence Partitioning - Menu Types', () => {
    const menuConfigs = [
      {
        menu: 'products',
        service: ProductCategoryService,
        nestedKey: 'category',
        fieldId: 'categoryId',
        mockData: mockCategories,
        responseKey: 'data',
      },
      {
        menu: 'locations',
        service: WarehouseService,
        nestedKey: 'warehouse',
        fieldId: 'warehouseId',
        mockData: mockWarehouses,
        responseKey: 'warehouses',
      },
      {
        menu: 'batches',
        service: ProductService,
        nestedKey: 'product',
        fieldId: 'productId',
        mockData: mockProducts,
        responseKey: 'data',
      },
    ];

    menuConfigs.forEach(({ menu, service, nestedKey, fieldId, mockData }) => {
      describe(`${menu} menu`, () => {
        it(`should call correct service for ${menu}`, async () => {
          const { result } = renderHook(() => 
            useDynamicOptions(menu, true, null)
          );

          await waitFor(() => {
            expect(result.current.options).toHaveLength(mockData.length);
          });

          expect(service.getAll).toHaveBeenCalledOnce();
        });

        it(`should format options correctly for ${menu}`, async () => {
          const { result } = renderHook(() => 
            useDynamicOptions(menu, true, null)
          );

          await waitFor(() => {
            expect(result.current.options).toHaveLength(mockData.length);
          });

          result.current.options.forEach((option, index) => {
            expect(option).toEqual({
              label: mockData[index].name,
              value: mockData[index].id,
            });
          });
        });

        it(`should extract correct initialValue for ${menu}`, async () => {
          const selectedRow = {
            [nestedKey]: { id: mockData[0].id, name: mockData[0].name },
          };

          const { result } = renderHook(() => 
            useDynamicOptions(menu, true, selectedRow)
          );

          await waitFor(() => {
            expect(result.current.initialValue).toEqual({
              [fieldId]: mockData[0].id,
            });
          });
        });
      });
    });
  });

  // Non-Functional - Performance
  describe('Non-Functional - Performance & Memory', () => {
    it('should not make unnecessary API calls', async () => {
      const { result, rerender } = renderHook(
        (props) => useDynamicOptions(props.menu, props.open, props.row),
        { initialProps: { menu: 'products', open: true, row: null } }
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });

      // Rerender with same props should not trigger new API call
      rerender({ menu: 'products', open: true, row: null });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ProductCategoryService.getAll).toHaveBeenCalledOnce();
    });

    it('should cleanup when dialog closes', async () => {
      const { result, rerender } = renderHook(
        ({ open }) => useDynamicOptions('products', open, null),
        { initialProps: { open: true } }
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });

      // Close dialog
      rerender({ open: false });

      expect(result.current.options).toEqual([]);
      expect(result.current.initialValue).toBeNull();
    });

    it('should handle rapid open/close cycles', async () => {
      const { result, rerender } = renderHook(
        ({ open }) => useDynamicOptions('products', open, null),
        { initialProps: { open: false } }
      );

      // Rapid toggle
      rerender({ open: true });
      rerender({ open: false });
      rerender({ open: true });
      rerender({ open: false });
      rerender({ open: true });

      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });
    });
  });

  // Real-world Integration Scenarios
  describe('Real-world Scenarios', () => {
    it('should simulate product form with category selection', async () => {
      // User opens product form
      const { result, rerender } = renderHook(
        ({ open, row }) => useDynamicOptions('products', open, row),
        { initialProps: { open: true, row: null } }
      );

      // Categories load
      await waitFor(() => {
        expect(result.current.options).toHaveLength(3);
      });

      // User edits existing product with category
      rerender({
        open: true,
        row: { category: { id: 'cat-2', name: 'Category 2' } },
      });

      await waitFor(() => {
        expect(result.current.initialValue).toEqual({ categoryId: 'cat-2' });
      });
    });

    it('should simulate location assignment with warehouse selection', async () => {
      const { result } = renderHook(() => 
        useDynamicOptions('locations', true, {
          warehouse: { id: 'wh-1', name: 'Warehouse 1' },
        })
      );

      await waitFor(() => {
        expect(result.current.options).toHaveLength(2);
        expect(result.current.initialValue).toEqual({ warehouseId: 'wh-1' });
      });
    });
  });
});
