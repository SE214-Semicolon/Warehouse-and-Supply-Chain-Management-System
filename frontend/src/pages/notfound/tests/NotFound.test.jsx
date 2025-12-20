import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '../NotFound';

describe('NotFound Component', () => {
  describe('Happy Path - Rendering', () => {
    it('renders 404 error message', () => {
      render(<NotFound />);

      expect(screen.getByText(/404/i)).toBeInTheDocument();
      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    });

    it('displays complete error text', () => {
      render(<NotFound />);

      expect(screen.getByText('404 - PAGE NOT FOUND')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders as a div element', () => {
      const { container } = render(<NotFound />);

      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    });

    it('contains text content in the div', () => {
      const { container } = render(<NotFound />);

      expect(container.firstChild).toHaveTextContent('404 - PAGE NOT FOUND');
    });
  });

  describe('Accessibility', () => {
    it('renders text that is accessible to screen readers', () => {
      render(<NotFound />);

      const errorText = screen.getByText('404 - PAGE NOT FOUND');
      expect(errorText).toBeVisible();
    });

    it('has no interactive elements', () => {
      const { container } = render(<NotFound />);

      const buttons = container.querySelectorAll('button');
      const links = container.querySelectorAll('a');

      expect(buttons).toHaveLength(0);
      expect(links).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('renders without crashing', () => {
      expect(() => render(<NotFound />)).not.toThrow();
    });

    it('renders consistently on multiple mounts', () => {
      const { unmount, container } = render(<NotFound />);
      const firstRender = container.innerHTML;
      unmount();

      const { container: container2 } = render(<NotFound />);
      const secondRender = container2.innerHTML;

      expect(firstRender).toBe(secondRender);
    });

    it('does not accept or use any props', () => {
      const { container } = render(<NotFound someUnusedProp="test" />);

      expect(container.firstChild).toHaveTextContent('404 - PAGE NOT FOUND');
    });
  });
});
