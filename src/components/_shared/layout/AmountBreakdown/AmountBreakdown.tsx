import React, { type ReactNode } from 'react';
import './AmountBreakdown.css';

export type AmountBreakdownItem = {
  id: string;
  label: ReactNode;
  amount: number;
};

export interface AmountBreakdownProps {
  /** Array of breakdown line items */
  items: AmountBreakdownItem[];
  /** Whether to style amounts as negative/deductions (red color) */
  negative?: boolean;
  /** Function to format amounts as strings */
  formatAmount: (amount: number) => string;
  rowLineLocation?: 'top' | 'bottom' | 'both';
  /** Optional CSS class name */
  className?: string;
}

/**
 * Reusable table-like breakdown component for displaying itemized amounts.
 * Used for deductions, tax breakdowns, retirement contributions, loan payments, etc.
 */
const AmountBreakdown: React.FC<AmountBreakdownProps> = ({
  items,
  negative = false,
  formatAmount,
  rowLineLocation = 'top',
  className = '',
}) => {
  return (
    <div className={`amount-breakdown ${className}`.trim()}>
      <div className="breakdown-items">
        {items.map((item) => (
          <div key={item.id} className={`breakdown-item ${rowLineLocation}`}>
            <span className="breakdown-label">{item.label}</span>
            <span className={`breakdown-amount ${negative ? 'breakdown-amount-negative' : ''}`}>
              {negative && <span className="amount-prefix">-</span>}
              {formatAmount(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AmountBreakdown;
