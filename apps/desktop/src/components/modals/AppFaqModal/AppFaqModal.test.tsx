import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppFaqModal from './AppFaqModal';

// FAQ content is sourced from the API at runtime (the bundled defaults are empty),
// so provide a fixture for the component test instead of relying on shipped data.
vi.mock('../../../services/referenceDataFetcher', () => {
  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Basics for setting up your plan.',
      searchTerms: 'setup basics salary',
      items: [
        {
          id: 'update-salary',
          question: 'How can I update my annual salary?',
          answer: 'Open Pay Options from the toolbar or View menu to update your annual salary.',
          keywords: ['salary', 'pay', 'income'],
        },
      ],
    },
    {
      id: 'other-income',
      title: 'Other Income',
      description: 'Managing additional income sources.',
      searchTerms: 'other income withholding',
      items: [
        {
          id: 'withholding-auto',
          question: "What does withholding mode 'auto' mean for other income sources?",
          answer: 'Auto withholding estimates taxes automatically for other income sources.',
          keywords: ['withholding', 'auto', 'other', 'income'],
        },
      ],
    },
  ];
  return { getCachedAppFaqSections: () => sections };
});

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
