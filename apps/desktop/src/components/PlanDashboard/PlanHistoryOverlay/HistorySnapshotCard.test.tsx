import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HistorySnapshotCard from './HistorySnapshotCard';

describe('HistorySnapshotCard other-income mapping', () => {
  it('renders fixed other income as a currency amount', () => {
    render(
      <HistorySnapshotCard
        entityType="other-income"
        snapshot={{
          id: 'oi-fixed',
          name: 'Rental Income',
          amountMode: 'fixed',
          amount: 1500,
          frequency: 'monthly',
          payTreatment: 'gross',
          enabled: true,
        }}
      />,
    );

    expect(screen.getByText('Rental Income')).toBeInTheDocument();
    expect(screen.getByText('Received Monthly: $1500.00')).toBeInTheDocument();
    expect(screen.getByText('$1500.00')).toBeInTheDocument();
  });

  it('renders percent-of-gross other income as a percent, not $0.00', () => {
    render(
      <HistorySnapshotCard
        entityType="other-income"
        snapshot={{
          id: 'oi-percent',
          name: 'Annual Bonus',
          amountMode: 'percent-of-gross',
          amount: 0,
          percentOfGross: 9,
          frequency: 'yearly',
          payTreatment: 'gross',
          enabled: true,
        }}
      />,
    );

    expect(screen.getByText('Annual Bonus')).toBeInTheDocument();
    expect(screen.getByText('Percent of base gross pay: 9%')).toBeInTheDocument();
    expect(screen.getByText('9%')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });
});
