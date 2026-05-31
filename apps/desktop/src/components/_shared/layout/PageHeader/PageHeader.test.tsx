import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Settings" subtitle="Manage your preferences" />);
    expect(screen.getByText('Manage your preferences')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<PageHeader title="Settings" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders actions content when provided', () => {
    render(
      <PageHeader
        title="Bills"
        actions={<button>Add Bill</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add Bill' })).toBeInTheDocument();
  });

  it('does not render actions container when actions not provided', () => {
    const { container } = render(<PageHeader title="Bills" />);
    expect(container.querySelector('.page-header-actions')).toBeNull();
  });

  it('applies page-header class to root element', () => {
    const { container } = render(<PageHeader title="Test" />);
    expect(container.firstChild).toHaveClass('page-header');
  });
});
