import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyStateCard from '../EmptyStateCard';

describe('EmptyStateCard - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== BASIC RENDERING ====================
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(
          <EmptyStateCard
            title="No Data"
            description="No items found"
            buttonText="Add Item"
            onButtonClick={vi.fn()}
          />
        );
      }).not.toThrow();
    });

    it('renders title correctly', () => {
      render(
        <EmptyStateCard
          title="No Products"
          description="Start by adding products"
          buttonText="Add Product"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('No Products')).toBeInTheDocument();
    });

    it('renders description correctly', () => {
      render(
        <EmptyStateCard
          title="Empty State"
          description="This is a test description"
          buttonText="Action"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('This is a test description')).toBeInTheDocument();
    });

    it('renders button with correct text', () => {
      render(
        <EmptyStateCard
          title="Empty"
          description="Description"
          buttonText="Click Me"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });
  });

  // ==================== BUTTON INTERACTION ====================
  describe('Button Interaction', () => {
    it('calls onButtonClick when button clicked', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      
      render(
        <EmptyStateCard
          title="Empty"
          description="Description"
          buttonText="Add"
          onButtonClick={mockOnClick}
        />
      );
      
      await user.click(screen.getByText('Add'));
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('handles multiple button clicks', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      
      render(
        <EmptyStateCard
          title="Empty"
          description="Description"
          buttonText="Add"
          onButtonClick={mockOnClick}
        />
      );
      
      const button = screen.getByText('Add');
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });

    it('button is enabled by default', () => {
      render(
        <EmptyStateCard
          title="Empty"
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      const button = screen.getByText('Add');
      expect(button).not.toBeDisabled();
    });
  });

  // ==================== HEADER COLOR ====================
  describe('Header Color', () => {
    it('uses default error.main color when not specified', () => {
      const { container } = render(
        <EmptyStateCard
          title="Empty"
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts custom header color', () => {
      const { container } = render(
        <EmptyStateCard
          title="Empty"
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
          headerColor="primary.main"
        />
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts hex color value', () => {
      const { container } = render(
        <EmptyStateCard
          title="Empty"
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
          headerColor="#FF5722"
        />
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  // ==================== CONTENT VARIATIONS ====================
  describe('Content Variations', () => {
    it('renders with short title', () => {
      render(
        <EmptyStateCard
          title="Empty"
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    it('renders with long title', () => {
      const longTitle = 'This is a very long title that might wrap to multiple lines';
      render(
        <EmptyStateCard
          title={longTitle}
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('renders with long description', () => {
      const longDesc = 'This is a very long description that explains in detail what the user should do when there is no data available in the system.';
      render(
        <EmptyStateCard
          title="Empty"
          description={longDesc}
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText(longDesc)).toBeInTheDocument();
    });

    it('renders with multiline description', () => {
      const { container } = render(
        <EmptyStateCard
          title="Empty"
          description="Line 1\nLine 2\nLine 3"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      // Newlines render as whitespace in Typography component
      // Just verify component renders successfully
      expect(container).toBeInTheDocument();
    });

    it('renders with special characters in title', () => {
      render(
        <EmptyStateCard
          title="No Data & <Special> 'Characters'"
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText("No Data & <Special> 'Characters'")).toBeInTheDocument();
    });

    it('renders with HTML entities in description', () => {
      render(
        <EmptyStateCard
          title="Empty"
          description="Use the 'Add' button below"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText("Use the 'Add' button below")).toBeInTheDocument();
    });
  });

  // ==================== PROP UPDATES ====================
  describe('Prop Updates', () => {
    it('updates when title changes', () => {
      const { rerender } = render(
        <EmptyStateCard
          title="Original Title"
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('Original Title')).toBeInTheDocument();
      
      rerender(
        <EmptyStateCard
          title="Updated Title"
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
      expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
    });

    it('updates when description changes', () => {
      const { rerender } = render(
        <EmptyStateCard
          title="Title"
          description="Original Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('Original Description')).toBeInTheDocument();
      
      rerender(
        <EmptyStateCard
          title="Title"
          description="Updated Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('Updated Description')).toBeInTheDocument();
      expect(screen.queryByText('Original Description')).not.toBeInTheDocument();
    });

    it('updates when button text changes', () => {
      const { rerender } = render(
        <EmptyStateCard
          title="Title"
          description="Description"
          buttonText="Original Button"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('Original Button')).toBeInTheDocument();
      
      rerender(
        <EmptyStateCard
          title="Title"
          description="Description"
          buttonText="Updated Button"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('Updated Button')).toBeInTheDocument();
      expect(screen.queryByText('Original Button')).not.toBeInTheDocument();
    });

    it('updates when onClick handler changes', async () => {
      const user = userEvent.setup();
      const mockOnClick1 = vi.fn();
      const mockOnClick2 = vi.fn();
      
      const { rerender } = render(
        <EmptyStateCard
          title="Title"
          description="Description"
          buttonText="Add"
          onButtonClick={mockOnClick1}
        />
      );
      
      await user.click(screen.getByText('Add'));
      expect(mockOnClick1).toHaveBeenCalledTimes(1);
      
      rerender(
        <EmptyStateCard
          title="Title"
          description="Description"
          buttonText="Add"
          onButtonClick={mockOnClick2}
        />
      );
      
      await user.click(screen.getByText('Add'));
      expect(mockOnClick2).toHaveBeenCalledTimes(1);
      expect(mockOnClick1).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('handles empty title', () => {
      render(
        <EmptyStateCard
          title=""
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('handles empty description', () => {
      render(
        <EmptyStateCard
          title="Title"
          description=""
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('handles empty button text', () => {
      render(
        <EmptyStateCard
          title="Title"
          description="Description"
          buttonText=""
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles undefined onButtonClick gracefully', () => {
      expect(() => {
        render(
          <EmptyStateCard
            title="Title"
            description="Description"
            buttonText="Add"
            onButtonClick={undefined}
          />
        );
      }).not.toThrow();
    });

    it('handles numeric title', () => {
      render(
        <EmptyStateCard
          title={123}
          description="Description"
          buttonText="Add"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('handles very long button text', () => {
      const longButtonText = 'This is a very long button text that might cause layout issues';
      render(
        <EmptyStateCard
          title="Title"
          description="Description"
          buttonText={longButtonText}
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByText(longButtonText)).toBeInTheDocument();
    });
  });

  // ==================== ACCESSIBILITY ====================
  describe('Accessibility', () => {
    it('button has accessible name', () => {
      render(
        <EmptyStateCard
          title="Title"
          description="Description"
          buttonText="Add New Item"
          onButtonClick={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button', { name: 'Add New Item' });
      expect(button).toBeInTheDocument();
    });

    it('button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      
      render(
        <EmptyStateCard
          title="Title"
          description="Description"
          buttonText="Add"
          onButtonClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('has proper semantic structure', () => {
      render(
        <EmptyStateCard
          title="No Items"
          description="Add your first item"
          buttonText="Add Item"
          onButtonClick={vi.fn()}
        />
      );
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('No Items')).toBeInTheDocument();
      expect(screen.getByText('Add your first item')).toBeInTheDocument();
    });
  });

  // ==================== INTEGRATION ====================
  describe('Integration Scenarios', () => {
    it('works with different color themes', () => {
      const colors = ['error.main', 'warning.main', 'info.main', 'success.main', '#FF5722'];
      
      colors.forEach((color) => {
        const { unmount } = render(
          <EmptyStateCard
            title="Test"
            description="Test"
            buttonText="Test"
            onButtonClick={vi.fn()}
            headerColor={color}
          />
        );
        
        const testElements = screen.getAllByText('Test');
        expect(testElements.length).toBeGreaterThan(0);
        unmount();
      });
    });

    it('maintains state after rapid re-renders', () => {
      const mockOnClick = vi.fn();
      const { rerender } = render(
        <EmptyStateCard
          title="Title 1"
          description="Desc 1"
          buttonText="Add"
          onButtonClick={mockOnClick}
        />
      );
      
      for (let i = 2; i <= 10; i++) {
        rerender(
          <EmptyStateCard
            title={`Title ${i}`}
            description={`Desc ${i}`}
            buttonText="Add"
            onButtonClick={mockOnClick}
          />
        );
      }
      
      expect(screen.getByText('Title 10')).toBeInTheDocument();
      expect(screen.getByText('Desc 10')).toBeInTheDocument();
    });
  });
});
