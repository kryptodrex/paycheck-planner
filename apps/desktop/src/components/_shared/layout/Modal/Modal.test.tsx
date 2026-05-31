import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <p>Content</p>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders children when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <p>Modal body</p>
      </Modal>,
    );
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('renders header string as h2', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} header="My Modal Title">
        content
      </Modal>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'My Modal Title' })).toBeInTheDocument();
  });

  it('renders custom header React node', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} header={<h3>Custom Header</h3>}>
        content
      </Modal>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Custom Header' })).toBeInTheDocument();
  });

  it('shows close button in header by default', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} header="Title">
        content
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} header="Title" showCloseButton={false}>
        content
      </Modal>,
    );
    expect(screen.queryByRole('button', { name: 'Close modal' })).toBeNull();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} header="Title">
        content
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>content</p>
      </Modal>,
    );
    await userEvent.click(screen.getByText('content').closest('.modal-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>content</p>
      </Modal>,
    );
    await userEvent.click(screen.getByText('content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        content
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when modal is closed', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={false} onClose={onClose}>
        content
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders footer when provided', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} footer={<button>Confirm</button>}>
        content
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('applies contentClassName to modal content', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} contentClassName="my-modal">
        content
      </Modal>,
    );
    expect(document.querySelector('.modal-content')).toHaveClass('my-modal');
  });
});
