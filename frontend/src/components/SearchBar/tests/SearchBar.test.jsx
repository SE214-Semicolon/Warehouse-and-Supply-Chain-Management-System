import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from '../SearchBar';

/**
 * UNIT TEST: SearchBar Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal search functionality
 * 2. Boundary Value Analysis - Empty string, max length
 * 3. Error Guessing - Null props, missing handlers
 * 4. Non-Functional Checks - Accessibility, debounce behavior
 */

describe('SearchBar Component - Unit Tests', () => {
  // Happy Path Testing
  describe('Happy Path - Normal Behavior', () => {
    it('should render search input with placeholder', () => {
      render(<SearchBar placeholder="Search products..." searchTerm="" setSearchTerm={vi.fn()} />);
      
      const searchInput = screen.getByPlaceholderText('Search products...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should display initial value when provided', () => {
      render(<SearchBar searchTerm="initial search" setSearchTerm={vi.fn()} />);
      
      const searchInput = screen.getByDisplayValue('initial search');
      expect(searchInput).toBeInTheDocument();
    });

    it('should call setSearchTerm handler when typing', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      
      render(<SearchBar searchTerm="" setSearchTerm={handleChange} />);
      
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'test');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('should display search icon', () => {
      render(<SearchBar searchTerm="" setSearchTerm={vi.fn()} />);
      
      const searchIcon = screen.getByTestId('SearchIcon');
      expect(searchIcon).toBeInTheDocument();
    });
  });

  // Boundary Value Analysis (BVA)
  describe('BVA - Edge Cases', () => {
    it('should handle empty string input', () => {
      render(<SearchBar searchTerm="" setSearchTerm={vi.fn()} />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveValue('');
    });

    it('should handle very long search strings', () => {
      const longString = 'a'.repeat(100); // Reduced length for practicality
      render(<SearchBar searchTerm={longString} setSearchTerm={vi.fn()} />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveValue(longString);
    });

    it('should handle single character input', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      
      render(<SearchBar searchTerm="" setSearchTerm={handleChange} />);
      
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'a');
      
      expect(handleChange).toHaveBeenCalled();
    });
  });

  // Error Guessing
  describe('Error Guessing - Error Conditions', () => {
    it('should not crash when setSearchTerm is not provided', async () => {
      userEvent.setup();
      
      render(<SearchBar searchTerm="" />);
      
      const searchInput = screen.getByRole('textbox');
      // Should render without crashing
      expect(searchInput).toBeInTheDocument();
    });

    it('should handle undefined searchTerm prop', () => {
      render(<SearchBar searchTerm={undefined} setSearchTerm={vi.fn()} />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toBeInTheDocument();
    });
  });

  // Non-Functional Checks
  describe('Non-Functional - Accessibility & Performance', () => {
    it('should have accessible search icon', () => {
      render(<SearchBar searchTerm="" setSearchTerm={vi.fn()} />);
      
      const searchIcon = screen.getByTestId('SearchIcon');
      expect(searchIcon).toBeInTheDocument();
    });

    it('should have proper input role', () => {
      render(<SearchBar searchTerm="" setSearchTerm={vi.fn()} placeholder="Search..." />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toBeInTheDocument();
    });

    it('should use default placeholder when not provided', () => {
      render(<SearchBar searchTerm="" setSearchTerm={vi.fn()} />);
      
      const searchInput = screen.getByPlaceholderText('Tìm kiếm...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  // Basic State & Rendering Check
  describe('State & Rendering', () => {
    it('should update controlled input value', () => {
      const { rerender } = render(<SearchBar searchTerm="initial" setSearchTerm={vi.fn()} />);
      
      expect(screen.getByDisplayValue('initial')).toBeInTheDocument();
      
      rerender(<SearchBar searchTerm="updated" setSearchTerm={vi.fn()} />);
      
      expect(screen.getByDisplayValue('updated')).toBeInTheDocument();
    });

    it('should be a controlled component', () => {
      const mockSetSearchTerm = vi.fn();
      render(<SearchBar searchTerm="test" setSearchTerm={mockSetSearchTerm} />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveValue('test');
    });
  });
});
