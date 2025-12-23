import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardSection from '../CardSection';

describe('CardSection - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== BASIC RENDERING ====================
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<CardSection title="Test Card">Content</CardSection>);
      }).not.toThrow();
    });

    it('renders title correctly', () => {
      render(<CardSection title="My Card Title">Content</CardSection>);
      
      expect(screen.getByText('My Card Title')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <CardSection title="Test">
          <div data-testid="child-content">Child Content</div>
        </CardSection>
      );
      
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('renders with default header color', () => {
      const { container } = render(
        <CardSection title="Test">Content</CardSection>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders with custom header color', () => {
      const { container } = render(
        <CardSection title="Test" headerColor="#FF5722">
          Content
        </CardSection>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  // ==================== ACTIONS ====================
  describe('Actions', () => {
    it('renders no actions by default', () => {
      render(<CardSection title="Test">Content</CardSection>);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders single action button', () => {
      const mockAction = vi.fn();
      const actions = [
        { label: 'Add', onClick: mockAction },
      ];

      render(
        <CardSection title="Test" actions={actions}>
          Content
        </CardSection>
      );
      
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('renders multiple action buttons', () => {
      const actions = [
        { label: 'Add', onClick: vi.fn() },
        { label: 'Edit', onClick: vi.fn() },
        { label: 'Delete', onClick: vi.fn() },
      ];

      render(
        <CardSection title="Test" actions={actions}>
          Content
        </CardSection>
      );
      
      expect(screen.getByText('Add')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('calls onClick when action button clicked', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      const actions = [
        { label: 'Action', onClick: mockOnClick },
      ];

      render(
        <CardSection title="Test" actions={actions}>
          Content
        </CardSection>
      );
      
      await user.click(screen.getByText('Action'));
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('renders action with startIcon', () => {
      const actions = [
        {
          label: 'Add',
          startIcon: <span data-testid="icon">+</span>,
          onClick: vi.fn(),
        },
      ];

      render(
        <CardSection title="Test" actions={actions}>
          Content
        </CardSection>
      );
      
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('applies custom variant to action button', () => {
      const actions = [
        {
          label: 'Outlined',
          variant: 'outlined',
          onClick: vi.fn(),
        },
      ];

      render(
        <CardSection title="Test" actions={actions}>
          Content
        </CardSection>
      );
      
      expect(screen.getByText('Outlined')).toBeInTheDocument();
    });

    it('applies custom sx styles to action button', () => {
      const actions = [
        {
          label: 'Styled',
          onClick: vi.fn(),
          sx: { backgroundColor: 'red' },
        },
      ];

      render(
        <CardSection title="Test" actions={actions}>
          Content
        </CardSection>
      );
      
      expect(screen.getByText('Styled')).toBeInTheDocument();
    });

    it('handles multiple clicks on same action', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      const actions = [
        { label: 'Action', onClick: mockOnClick },
      ];

      render(
        <CardSection title="Test" actions={actions}>
          Content
        </CardSection>
      );
      
      const button = screen.getByText('Action');
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== CONTENT PADDING ====================
  describe('Content Padding', () => {
    it('uses default content padding', () => {
      const { container } = render(
        <CardSection title="Test">
          <div data-testid="content">Content</div>
        </CardSection>
      );
      
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies custom content padding', () => {
      const { container } = render(
        <CardSection title="Test" contentPadding={4}>
          <div data-testid="content">Content</div>
        </CardSection>
      );
      
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts zero padding', () => {
      const { container } = render(
        <CardSection title="Test" contentPadding={0}>
          <div data-testid="content">Content</div>
        </CardSection>
      );
      
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  // ==================== CHILDREN TYPES ====================
  describe('Children Types', () => {
    it('renders string children', () => {
      render(<CardSection title="Test">Simple text content</CardSection>);
      
      expect(screen.getByText('Simple text content')).toBeInTheDocument();
    });

    it('renders component children', () => {
      const ChildComponent = () => <div>Child Component</div>;
      
      render(
        <CardSection title="Test">
          <ChildComponent />
        </CardSection>
      );
      
      expect(screen.getByText('Child Component')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <CardSection title="Test">
          <div>First Child</div>
          <div>Second Child</div>
          <div>Third Child</div>
        </CardSection>
      );
      
      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });

    it('renders nested components', () => {
      render(
        <CardSection title="Test">
          <div>
            <span>Nested</span>
            <span>Content</span>
          </div>
        </CardSection>
      );
      
      expect(screen.getByText('Nested')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('handles null children', () => {
      expect(() => {
        render(<CardSection title="Test">{null}</CardSection>);
      }).not.toThrow();
    });

    it('handles undefined children', () => {
      expect(() => {
        render(<CardSection title="Test">{undefined}</CardSection>);
      }).not.toThrow();
    });
  });

  // ==================== HEADER COLORS ====================
  describe('Header Colors', () => {
    it('accepts hex color', () => {
      const { container } = render(
        <CardSection title="Test" headerColor="#FF5722">
          Content
        </CardSection>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts RGB color', () => {
      const { container } = render(
        <CardSection title="Test" headerColor="rgb(255, 87, 34)">
          Content
        </CardSection>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts named color', () => {
      const { container } = render(
        <CardSection title="Test" headerColor="red">
          Content
        </CardSection>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts gradient', () => {
      const { container } = render(
        <CardSection
          title="Test"
          headerColor="linear-gradient(to right, red, blue)"
        >
          Content
        </CardSection>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  // ==================== INTEGRATION SCENARIOS ====================
  describe('Integration Scenarios', () => {
    it('renders card with all props', () => {
      const mockOnClick = vi.fn();
      const actions = [
        {
          label: 'Action',
          startIcon: <span>+</span>,
          variant: 'outlined',
          onClick: mockOnClick,
          sx: { color: 'blue' },
        },
      ];

      render(
        <CardSection
          title="Complete Card"
          headerColor="#3e468a"
          actions={actions}
          contentPadding={3}
        >
          <div>Complex Content</div>
        </CardSection>
      );
      
      expect(screen.getByText('Complete Card')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Complex Content')).toBeInTheDocument();
    });

    it('updates when props change', () => {
      const { rerender } = render(
        <CardSection title="Original Title">Original Content</CardSection>
      );
      
      expect(screen.getByText('Original Title')).toBeInTheDocument();
      expect(screen.getByText('Original Content')).toBeInTheDocument();
      
      rerender(
        <CardSection title="Updated Title">Updated Content</CardSection>
      );
      
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
      expect(screen.getByText('Updated Content')).toBeInTheDocument();
      expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Original Content')).not.toBeInTheDocument();
    });

    it('updates actions dynamically', async () => {
      const user = userEvent.setup();
      const mockAction1 = vi.fn();
      const mockAction2 = vi.fn();

      const { rerender } = render(
        <CardSection
          title="Test"
          actions={[{ label: 'Action 1', onClick: mockAction1 }]}
        >
          Content
        </CardSection>
      );
      
      await user.click(screen.getByText('Action 1'));
      expect(mockAction1).toHaveBeenCalled();
      
      rerender(
        <CardSection
          title="Test"
          actions={[{ label: 'Action 2', onClick: mockAction2 }]}
        >
          Content
        </CardSection>
      );
      
      expect(screen.queryByText('Action 1')).not.toBeInTheDocument();
      await user.click(screen.getByText('Action 2'));
      expect(mockAction2).toHaveBeenCalled();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('handles empty title', () => {
      render(<CardSection title="">Content</CardSection>);
      
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('handles very long title', () => {
      const longTitle = 'A'.repeat(200);
      render(<CardSection title={longTitle}>Content</CardSection>);
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles empty actions array', () => {
      render(
        <CardSection title="Test" actions={[]}>
          Content
        </CardSection>
      );
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('handles action without onClick', () => {
      const actions = [{ label: 'No Click' }];
      
      expect(() => {
        render(
          <CardSection title="Test" actions={actions}>
            Content
          </CardSection>
        );
      }).not.toThrow();
    });

    it('handles action without label', () => {
      const actions = [{ onClick: vi.fn() }];
      
      render(
        <CardSection title="Test" actions={actions}>
          Content
        </CardSection>
      );
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles very large content', () => {
      const largeContent = Array.from({ length: 100 }, (_, i) => (
        <div key={i}>Item {i}</div>
      ));
      
      render(
        <CardSection title="Test">
          {largeContent}
        </CardSection>
      );
      
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 99')).toBeInTheDocument();
    });
  });

  // ==================== ACCESSIBILITY ====================
  describe('Accessibility', () => {
    it('renders buttons with accessible labels', () => {
      const actions = [
        { label: 'Add Item', onClick: vi.fn() },
      ];

      render(
        <CardSection title="Test" actions={actions}>
          Content
        </CardSection>
      );
      
      const button = screen.getByText('Add Item');
      expect(button).toHaveAccessibleName('Add Item');
    });

    it('maintains heading hierarchy', () => {
      render(<CardSection title="Section Title">Content</CardSection>);
      
      expect(screen.getByText('Section Title')).toBeInTheDocument();
    });

    it('allows keyboard interaction with buttons', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      const actions = [
        { label: 'Clickable', onClick: mockOnClick },
      ];

      render(
        <CardSection title="Test" actions={actions}>
          Content
        </CardSection>
      );
      
      const button = screen.getByText('Clickable');
      button.focus();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalled();
    });
  });
});
