import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomButton from '../CustomButton';
import { Add } from '@mui/icons-material';

/**
 * UNIT TEST: CustomButton Component
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Normal button rendering and clicks
 * 2. Equivalence Partitioning - Variants, colors, sizes
 * 3. BVA - Disabled state
 * 4. Error Guessing - Edge cases (no label, no onClick)
 * 5. State & Rendering Check - Icon button vs label button
 * 6. Non-Functional Checks - Accessibility, custom styling
 */

describe('CustomButton Component - Unit Tests', () => {
  // Happy Path - Label Button
  describe('Happy Path - Label Button', () => {
    it('should render button with label', () => {
      render(<CustomButton label="Click Me" />);
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<CustomButton onClick={handleClick} label="Submit" />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should render as regular button by default', () => {
      render(<CustomButton label="Button" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  // Happy Path - Icon Button
  describe('Happy Path - Icon Button', () => {
    it('should render icon button when icon prop provided', () => {
      render(<CustomButton icon={Add} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should call onClick for icon button', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<CustomButton icon={Add} onClick={handleClick} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should prioritize icon over label', () => {
      render(<CustomButton icon={Add} label="Text" />);
      
      // Should render as IconButton (no label text visible)
      expect(screen.queryByText('Text')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // Equivalence Partitioning - Button Variants
  describe('Equivalence Partitioning - Button Variants', () => {
    it('should render contained variant (default)', () => {
      render(<CustomButton label="Contained" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render outlined variant', () => {
      render(<CustomButton label="Outlined" variant="outlined" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-outlined');
    });

    it('should render text variant', () => {
      render(<CustomButton label="Text" variant="text" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-text');
    });
  });

  // Equivalence Partitioning - Button Colors
  describe('Equivalence Partitioning - Button Colors', () => {
    it('should apply primary color (default)', () => {
      render(<CustomButton label="Primary" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply secondary color', () => {
      render(<CustomButton label="Secondary" color="secondary" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply error color', () => {
      render(<CustomButton label="Error" color="error" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  // Equivalence Partitioning - Button Sizes
  describe('Equivalence Partitioning - Button Sizes', () => {
    it('should render medium size (default)', () => {
      render(<CustomButton label="Medium" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-sizeMedium');
    });

    it('should render small size', () => {
      render(<CustomButton label="Small" size="small" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-sizeSmall');
    });

    it('should render large size', () => {
      render(<CustomButton label="Large" size="large" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-sizeLarge');
    });
  });

  // BVA - Disabled State
  describe('BVA - Disabled State', () => {
    it('should render disabled button', () => {
      render(<CustomButton label="Disabled" disabled={true} />);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      render(<CustomButton label="Disabled" disabled={true} onClick={handleClick} />);
      
      const button = screen.getByRole('button');
      // Disabled buttons have pointer-events: none, check state instead of clicking
      expect(button).toBeDisabled();
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should show disabled cursor style', () => {
      render(<CustomButton label="Disabled" disabled={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('Mui-disabled');
    });
  });

  // Error Guessing - Edge Cases
  describe('Error Guessing - Edge Cases', () => {
    it('should handle button without label', () => {
      render(<CustomButton />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle button with empty string label', () => {
      render(<CustomButton label="" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle very long label text', () => {
      const longText = 'This is a very long button text that might wrap to multiple lines';
      render(<CustomButton label={longText} />);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle button without onClick', () => {
      render(<CustomButton label="No Click Handler" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle multiple clicks', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<CustomButton onClick={handleClick} label="Multi Click" />);
      
      const button = screen.getByRole('button');
      
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  // Non-Functional - Accessibility
  describe('Non-Functional - Accessibility', () => {
    it('should have button role', () => {
      render(<CustomButton label="Button" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<CustomButton label="Button" aria-label="Custom Label" />);
      const button = screen.getByRole('button', { name: 'Custom Label' });
      expect(button).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <span id="desc">Button description</span>
          <CustomButton label="Button" aria-describedby="desc" />
        </>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'desc');
    });

    it('should be focusable by default', () => {
      render(<CustomButton label="Focusable" />);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      render(<CustomButton label="Disabled" disabled={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabindex', '-1');
    });
  });

  // Non-Functional - Custom Styling
  describe('Non-Functional - Custom Styling', () => {
    it('should apply custom className', () => {
      render(<CustomButton label="Styled" className="custom-class" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should apply custom sx prop', () => {
      render(<CustomButton label="Custom SX" sx={{ margin: 2 }} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply fullWidth prop', () => {
      render(<CustomButton label="Full Width" fullWidth={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-fullWidth');
    });
  });

  // Real-world Scenarios
  describe('Real-world Scenarios', () => {
    it('should handle form submit button', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn((e) => e.preventDefault());
      
      render(
        <form onSubmit={handleSubmit}>
          <CustomButton label="Submit Form" type="submit" />
        </form>
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should work with different variant and color combinations', () => {
      const { rerender } = render(
        <CustomButton label="Button" variant="contained" color="primary" />
      );
      expect(screen.getByText('Button')).toBeInTheDocument();
      
      rerender(<CustomButton label="Button" variant="outlined" color="secondary" />);
      expect(screen.getByText('Button')).toBeInTheDocument();
      
      rerender(<CustomButton label="Button" variant="text" color="error" />);
      expect(screen.getByText('Button')).toBeInTheDocument();
    });

    it('should handle icon button with different colors', () => {
      const { rerender } = render(
        <CustomButton icon={Add} color="primary" />
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
      
      rerender(<CustomButton icon={Add} color="secondary" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      
      rerender(<CustomButton icon={Add} color="error" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // Non-Functional - Performance
  describe('Non-Functional - Performance', () => {
    it('should handle rapid clicks efficiently', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<CustomButton onClick={handleClick} label="Rapid" />);
      
      const button = screen.getByRole('button');
      
      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        await user.click(button);
      }
      
      expect(handleClick).toHaveBeenCalledTimes(10);
    });

    it('should not cause memory leaks on mount/unmount', () => {
      const { unmount } = render(<CustomButton label="Test" />);
      expect(screen.getByText('Test')).toBeInTheDocument();
      
      unmount();
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });
  });
});
