import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppFaqModal from './AppFaqModal';

describe('AppFaqModal', () => {
  it('renders searchable FAQ sections', () => {
    render(<AppFaqModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('heading', { name: 'App FAQs' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search FAQs')).toBeInTheDocument();
    expect(screen.getByLabelText('FAQ sections')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Getting Started' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How can I update my annual salary?' })).toBeInTheDocument();
  });

  it('opens and closes question drawers', async () => {
    const user = userEvent.setup();
    render(<AppFaqModal isOpen={true} onClose={() => {}} />);

    const questionButton = screen.getByRole('button', { name: 'How can I update my annual salary?' });
    expect(questionButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(questionButton);
    expect(questionButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Open Pay Options from the toolbar or View menu/i)).toBeInTheDocument();

    await user.click(questionButton);
    expect(questionButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('filters by complex question keywords and keeps relevant result visible', async () => {
    const user = userEvent.setup();
    render(<AppFaqModal isOpen={true} onClose={() => {}} />);

    await user.type(screen.getByLabelText('Search FAQs'), 'withholding auto other income');

    expect(screen.getByRole('button', { name: "What does withholding mode 'auto' mean for other income sources?" })).toBeInTheDocument();
  });

  it('shows an empty state when search has no matches', async () => {
    const user = userEvent.setup();
    render(<AppFaqModal isOpen={true} onClose={() => {}} />);

    await user.type(screen.getByLabelText('Search FAQs'), 'zebra astronaut');

    expect(screen.getByText('No FAQ sections match your search.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No matching FAQs found. Try broader keywords.');
  });
});
