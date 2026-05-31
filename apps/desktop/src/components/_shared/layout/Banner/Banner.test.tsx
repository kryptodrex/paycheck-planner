import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Banner from './Banner';

describe('Banner', () => {
  it('renders label and value', () => {
    render(<Banner label="Total Income" value="$4,500.00" />);
    expect(screen.getByText('Total Income')).toBeInTheDocument();
    expect(screen.getByText('$4,500.00')).toBeInTheDocument();
  });

  it('has role="status" and aria-live="polite"', () => {
    render(<Banner label="Status" value="OK" />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('applies banner-label class to label', () => {
    render(<Banner label="My Label" value="val" />);
    expect(screen.getByText('My Label')).toHaveClass('banner-label');
  });

  it('applies banner-value class to value', () => {
    render(<Banner label="lbl" value="My Value" />);
    expect(screen.getByText('My Value')).toHaveClass('banner-value');
  });

  it('renders React node for label', () => {
    render(<Banner label={<strong>Bold label</strong>} value="val" />);
    expect(screen.getByText('Bold label').tagName).toBe('STRONG');
  });

  it('renders React node for value', () => {
    render(<Banner label="lbl" value={<em>Italic value</em>} />);
    expect(screen.getByText('Italic value').tagName).toBe('EM');
  });
});
