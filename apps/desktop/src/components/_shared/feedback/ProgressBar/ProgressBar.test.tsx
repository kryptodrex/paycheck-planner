import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('renders the progress fill at the given percentage', () => {
    const { container } = render(<ProgressBar percentage={60} />);
    const fill = container.querySelector('.shared-progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('60%');
  });

  it('clamps percentage to 0 when below 0', () => {
    const { container } = render(<ProgressBar percentage={-10} />);
    const fill = container.querySelector('.shared-progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('clamps percentage to 100 when above 100', () => {
    const { container } = render(<ProgressBar percentage={150} />);
    const fill = container.querySelector('.shared-progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('renders label when provided', () => {
    render(<ProgressBar percentage={50} label="Upload progress" />);
    expect(screen.getByText('Upload progress')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    const { container } = render(<ProgressBar percentage={50} />);
    expect(container.querySelector('.shared-progress-label')).toBeNull();
  });

  it('renders details when provided', () => {
    render(<ProgressBar percentage={75} details="75 of 100 items" />);
    expect(screen.getByText('75 of 100 items')).toBeInTheDocument();
  });

  it('does not render details when not provided', () => {
    const { container } = render(<ProgressBar percentage={50} />);
    expect(container.querySelector('.shared-progress-details')).toBeNull();
  });

  it('applies additional className', () => {
    const { container } = render(<ProgressBar percentage={50} className="my-bar" />);
    expect(container.firstChild).toHaveClass('shared-progress-bar', 'my-bar');
  });
});
