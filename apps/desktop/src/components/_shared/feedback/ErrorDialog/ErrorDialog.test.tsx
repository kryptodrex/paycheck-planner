import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorDialog from './ErrorDialog';

describe('ErrorDialog', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ErrorDialog isOpen={false} onClose={vi.fn()} title="Error" message="Something failed" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title and message when isOpen is true', () => {
    render(
      <ErrorDialog isOpen={true} onClose={vi.fn()} title="Upload Error" message="File too large" />,
    );
    expect(screen.getByText('Upload Error')).toBeInTheDocument();
    expect(screen.getByText('File too large')).toBeInTheDocument();
  });

  it('renders default action label "OK"', () => {
    render(
      <ErrorDialog isOpen={true} onClose={vi.fn()} title="Error" message="Oops" />,
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('renders custom action label', () => {
    render(
      <ErrorDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Error"
        message="Oops"
        actionLabel="Dismiss"
      />,
    );
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('calls onClose when action button is clicked', async () => {
    const onClose = vi.fn();
    render(<ErrorDialog isOpen={true} onClose={onClose} title="Error" message="Oops" />);
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    render(<ErrorDialog isOpen={true} onClose={onClose} title="Error" message="Oops" />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders message as React node', () => {
    render(
      <ErrorDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Error"
        message={<strong>Critical failure</strong>}
      />,
    );
    expect(screen.getByText('Critical failure').tagName).toBe('STRONG');
  });
});
