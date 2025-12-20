import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DetailHeader from '../DetailHeader';

describe('DetailHeader - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== BASIC RENDERING ====================
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<DetailHeader title="Test Header" />);
      }).not.toThrow();
    });

    it('renders title correctly', () => {
      render(<DetailHeader title="Product Details" />);
      
      expect(screen.getByText('Product Details')).toBeInTheDocument();
    });

    it('renders without back button when onBack not provided', () => {
      render(<DetailHeader title="Test" />);
      
      // Back button icon should not be present when onBack is not provided
      expect(screen.queryByTestId('ArrowBackIcon')).not.toBeInTheDocument();
      // Edit button only renders if onEdit is provided
    });

    it('calls onBack when back button clicked', async () => {
      const user = userEvent.setup();
      const mockOnBack = vi.fn();
      render(<DetailHeader title="Test" onBack={mockOnBack} />);
      
      const buttons = screen.getAllByRole('button');
      const backButton = buttons[0]; // First button is back button
      await user.click(backButton);
      
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('handles multiple back button clicks', async () => {
      const user = userEvent.setup();
      const mockOnBack = vi.fn();
      render(<DetailHeader title="Test" onBack={mockOnBack} />);
      
      const buttons = screen.getAllByRole('button');
      const backButton = buttons[0];
      await user.click(backButton);
      await user.click(backButton);
      await user.click(backButton);
      
      expect(mockOnBack).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== EDIT BUTTON ====================
  describe('Edit Button', () => {
    it('renders edit button when onEdit provided', () => {
      const mockOnEdit = vi.fn();
      render(<DetailHeader title="Test" onEdit={mockOnEdit} />);
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('calls onEdit when edit button clicked', async () => {
      const user = userEvent.setup();
      const mockOnEdit = vi.fn();
      render(<DetailHeader title="Test" onEdit={mockOnEdit} />);
      
      await user.click(screen.getByText('Edit'));
      
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('renders both back and edit buttons together', () => {
      const mockOnBack = vi.fn();
      const mockOnEdit = vi.fn();
      render(<DetailHeader title="Test" onBack={mockOnBack} onEdit={mockOnEdit} />);
      
      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  // ==================== SUBTITLE ITEMS ====================
  describe('Subtitle Items', () => {
    it('does not render subtitle section when no items', () => {
      render(<DetailHeader title="Test" subtitleItems={[]} />);
      
      expect(screen.queryByText(/:/)).not.toBeInTheDocument();
    });

    it('renders single subtitle item', () => {
      const subtitleItems = [
        { label: 'SKU', value: 'PROD-001' },
      ];
      
      render(<DetailHeader title="Test" subtitleItems={subtitleItems} />);
      
      expect(screen.getByText('SKU: PROD-001')).toBeInTheDocument();
    });

    it('renders multiple subtitle items', () => {
      const subtitleItems = [
        { label: 'SKU', value: 'PROD-001' },
        { label: 'Category', value: 'Electronics' },
        { label: 'Status', value: 'Active' },
      ];
      
      render(<DetailHeader title="Test" subtitleItems={subtitleItems} />);
      
      expect(screen.getByText('SKU: PROD-001')).toBeInTheDocument();
      expect(screen.getByText('Category: Electronics')).toBeInTheDocument();
      expect(screen.getByText('Status: Active')).toBeInTheDocument();
    });

    it('handles subtitle items with empty values', () => {
      const subtitleItems = [
        { label: 'SKU', value: '' },
      ];
      
      render(<DetailHeader title="Test" subtitleItems={subtitleItems} />);
      
      expect(screen.getByText('SKU:')).toBeInTheDocument();
    });

    it('handles subtitle items with numeric values', () => {
      const subtitleItems = [
        { label: 'ID', value: 123 },
      ];
      
      render(<DetailHeader title="Test" subtitleItems={subtitleItems} />);
      
      expect(screen.getByText('ID: 123')).toBeInTheDocument();
    });
  });

  // ==================== STAT ITEMS ====================
  describe('Stat Items', () => {
    it('does not render stat section when no items', () => {
      render(<DetailHeader title="Test" statItems={[]} />);
      
      const title = screen.getByText('Test');
      expect(title).toBeInTheDocument();
    });

    it('renders single stat item', () => {
      const statItems = [
        { label: 'Total Quantity', value: '1000' },
      ];
      
      render(<DetailHeader title="Test" statItems={statItems} />);
      
      expect(screen.getByText('Total Quantity')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('renders multiple stat items', () => {
      const statItems = [
        { label: 'Total', value: '1000' },
        { label: 'Available', value: '800' },
        { label: 'Reserved', value: '200' },
      ];
      
      render(<DetailHeader title="Test" statItems={statItems} />);
      
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('800')).toBeInTheDocument();
      expect(screen.getByText('Reserved')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    it('handles stat items with zero values', () => {
      const statItems = [
        { label: 'Count', value: 0 },
      ];
      
      render(<DetailHeader title="Test" statItems={statItems} />);
      
      expect(screen.getByText('Count')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles stat items with string values', () => {
      const statItems = [
        { label: 'Status', value: 'Active' },
      ];
      
      render(<DetailHeader title="Test" statItems={statItems} />);
      
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  // ==================== COMBINED SCENARIOS ====================
  describe('Combined Scenarios', () => {
    it('renders with all props provided', () => {
      const mockOnBack = vi.fn();
      const mockOnEdit = vi.fn();
      const subtitleItems = [
        { label: 'SKU', value: 'PROD-001' },
      ];
      const statItems = [
        { label: 'Total', value: '1000' },
      ];
      
      render(
        <DetailHeader
          title="Product Details"
          subtitleItems={subtitleItems}
          statItems={statItems}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
        />
      );
      
      expect(screen.getByText('Product Details')).toBeInTheDocument();
      expect(screen.getByText('SKU: PROD-001')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('handles dynamic updates to subtitle items', () => {
      const { rerender } = render(
        <DetailHeader
          title="Test"
          subtitleItems={[{ label: 'Status', value: 'Draft' }]}
        />
      );
      
      expect(screen.getByText('Status: Draft')).toBeInTheDocument();
      
      rerender(
        <DetailHeader
          title="Test"
          subtitleItems={[{ label: 'Status', value: 'Published' }]}
        />
      );
      
      expect(screen.getByText('Status: Published')).toBeInTheDocument();
      expect(screen.queryByText('Status: Draft')).not.toBeInTheDocument();
    });

    it('handles dynamic updates to stat items', () => {
      const { rerender } = render(
        <DetailHeader
          title="Test"
          statItems={[{ label: 'Count', value: '10' }]}
        />
      );
      
      expect(screen.getByText('10')).toBeInTheDocument();
      
      rerender(
        <DetailHeader
          title="Test"
          statItems={[{ label: 'Count', value: '20' }]}
        />
      );
      
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.queryByText('10')).not.toBeInTheDocument();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('handles empty title', () => {
      render(<DetailHeader title="" />);
      
      expect(screen.queryByRole('heading')).toBeInTheDocument();
    });

    it('handles very long title', () => {
      const longTitle = 'A'.repeat(200);
      render(<DetailHeader title={longTitle} />);
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles special characters in title', () => {
      render(<DetailHeader title="Test & <Special> 'Characters'" />);
      
      expect(screen.getByText("Test & <Special> 'Characters'")).toBeInTheDocument();
    });

    it('handles null subtitle items gracefully', () => {
      expect(() => {
        render(<DetailHeader title="Test" subtitleItems={null} />);
      }).toThrow();
    });

    it('handles undefined subtitle items', () => {
      render(<DetailHeader title="Test" subtitleItems={undefined} />);
      
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('handles very large stat values', () => {
      const statItems = [
        { label: 'Count', value: '999,999,999' },
      ];
      
      render(<DetailHeader title="Test" statItems={statItems} />);
      
      expect(screen.getByText('999,999,999')).toBeInTheDocument();
    });

    it('handles subtitle items with special characters', () => {
      const subtitleItems = [
        { label: 'Name', value: 'Test & <Special>' },
      ];
      
      render(<DetailHeader title="Test" subtitleItems={subtitleItems} />);
      
      expect(screen.getByText('Name: Test & <Special>')).toBeInTheDocument();
    });
  });

  // ==================== ACCESSIBILITY ====================
  describe('Accessibility', () => {
    it('has proper heading for title', () => {
      render(<DetailHeader title="Product Details" />);
      
      const heading = screen.getByRole('heading', { name: 'Product Details' });
      expect(heading).toBeInTheDocument();
    });

    it('back button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const mockOnBack = vi.fn();
      render(<DetailHeader title="Test" onBack={mockOnBack} />);
      
      const buttons = screen.getAllByRole('button');
      const backButton = buttons[0];
      backButton.focus();
      expect(backButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('edit button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const mockOnEdit = vi.fn();
      render(<DetailHeader title="Test" onEdit={mockOnEdit} />);
      
      const editButton = screen.getByText('Edit');
      editButton.focus();
      expect(editButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnEdit).toHaveBeenCalled();
    });

    it('maintains focus management between buttons', async () => {
      const user = userEvent.setup();
      const mockOnBack = vi.fn();
      const mockOnEdit = vi.fn();
      render(<DetailHeader title="Test" onBack={mockOnBack} onEdit={mockOnEdit} />);
      
      const buttons = screen.getAllByRole('button');
      
      await user.tab();
      expect(buttons[0]).toHaveFocus();
      
      await user.tab();
      expect(buttons[1]).toHaveFocus();
    });
  });
});
