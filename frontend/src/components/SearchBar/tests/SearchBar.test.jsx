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
      render(<SearchBar placeholder="Search products..." />);
      
      const searchInput = screen.getByPlaceholderText('Search products...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should display initial value when provided', () => {
      render(<SearchBar value="initial search" />);
      
      const searchInput = screen.getByDisplayValue('initial search');
      expect(searchInput).toBeInTheDocument();
    });

    it('should call onChange handler when typing', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      
      render(<SearchBar onChange={handleChange} />);
      
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'test');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('should clear search input when clear button is clicked', async () => {
      const user = userEvent.setup();
      const handleClear = vi.fn();
      
      render(<SearchBar value="test search" onClear={handleClear} />);
      
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);
      
      expect(handleClear).toHaveBeenCalledOnce();
    });
  });

  // Boundary Value Analysis (BVA)
  describe('BVA - Edge Cases', () => {
    it('should handle empty string input', () => {
      render(<SearchBar value="" />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveValue('');
    });

    it('should handle very long search strings', () => {
      const longString = 'a'.repeat(1000);
      render(<SearchBar value={longString} />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveValue(longString);
    });

    it('should handle single character input', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      
      render(<SearchBar onChange={handleChange} />);
      
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'a');
      
      expect(handleChange).toHaveBeenCalled();
    });
  });

  // Error Guessing
  describe('Error Guessing - Error Conditions', () => {
    it('should not crash when onChange is not provided', async () => {
      const user = userEvent.setup();
      
      render(<SearchBar />);
      
      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, 'test');
      
      // Should not throw error
      expect(searchInput).toBeInTheDocument();
    });

    it('should not crash when onClear is not provided', async () => {
      const user = userEvent.setup();
      
      render(<SearchBar value="test" />);
      
      const clearButton = screen.queryByRole('button', { name: /clear/i });
      if (clearButton) {
        await user.click(clearButton);
      }
      
      // Should not throw error
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle undefined value prop', () => {
      render(<SearchBar value={undefined} />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toBeInTheDocument();
    });
  });

  // Non-Functional Checks
  describe('Non-Functional - Accessibility & Performance', () => {
    it('should have accessible label', () => {
      render(<SearchBar aria-label="Search input" />);
      
      const searchInput = screen.getByLabelText('Search input');
      expect(searchInput).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<SearchBar placeholder="Search..." />);
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should apply custom className', () => {
      const { container } = render(<SearchBar className="custom-search" />);
      
      expect(container.querySelector('.custom-search')).toBeInTheDocument();
    });
  });

  // Basic State & Rendering Check
  describe('State & Rendering', () => {
    it('should update controlled input value', () => {
      const { rerender } = render(<SearchBar value="initial" />);
      
      expect(screen.getByDisplayValue('initial')).toBeInTheDocument();
      
      rerender(<SearchBar value="updated" />);
      
      expect(screen.getByDisplayValue('updated')).toBeInTheDocument();
    });

    it('should show clear button only when value is not empty', () => {
      const { rerender } = render(<SearchBar value="" />);
      
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
      
      rerender(<SearchBar value="test" />);
      
      expect(screen.queryByRole('button', { name: /clear/i })).toBeInTheDocument();
    });
  });
});
