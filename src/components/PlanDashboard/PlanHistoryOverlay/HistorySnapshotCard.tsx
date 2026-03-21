import React from 'react';
import type { AuditEntityType } from '../../../types/audit';
import SectionItemCard from '../../_shared/layout/SectionItemCard';
import AmountBreakdown from '../../_shared/layout/AmountBreakdown';
import PillBadge from '../../_shared/controls/PillBadge';

const NOOP = () => {};

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  'semi-monthly': 'Twice monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'semi-annual': 'Twice yearly',
  yearly: 'Yearly',
  custom: 'Custom',
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  mortgage: 'Mortgage',
  auto: 'Auto Loan',
  student: 'Student Loan',
  personal: 'Personal Loan',
  'credit-card': 'Credit Card',
  other: 'Other',
};

const RETIREMENT_TYPE_LABELS: Record<string, string> = {
  '401k': '401(k)',
  '403b': '403(b)',
  'roth-ira': 'Roth IRA',
  'traditional-ira': 'Traditional IRA',
  pension: 'Pension',
  other: 'Other',
};

const fmt = (amount: number) => `$${amount.toFixed(2)}`;

/**
 * Entity types that are displayed as SectionItemCards in the live UI.
 * History entries for these types are rendered as read-only cards.
 */
export const CARD_ENTITY_TYPES = new Set<AuditEntityType>([
  'bill',
  'deduction',
  'benefit',
  'savings-contribution',
  'retirement-election',
  'loan',
]);

type S = Record<string, unknown>;
type CardProps = React.ComponentProps<typeof SectionItemCard>;
type SnapshotMapper = (
  s: S,
  entityNames: Record<string, string>,
) => Omit<CardProps, 'onEdit' | 'onDelete' | 'hideActions'> | null;

type PaymentLine = {
  id?: string;
  label: string;
  amount: number;
  frequency?: string;
};

const parsePaymentLines = (value: unknown): PaymentLine[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((line) => line && typeof line === 'object')
    .map((line) => {
      const item = line as Record<string, unknown>;
      return {
        id: typeof item.id === 'string' ? item.id : undefined,
        label: typeof item.label === 'string' && item.label.length > 0 ? item.label : 'Line Item',
        amount: typeof item.amount === 'number' ? item.amount : 0,
        frequency: typeof item.frequency === 'string' ? item.frequency : undefined,
      };
    });
};

const SNAPSHOT_MAPPERS: Partial<Record<AuditEntityType, SnapshotMapper>> = {
  'bill': (s) => {
    const amount = Number(s.amount ?? 0);
    const frequency = String(s.frequency ?? 'monthly');
    const freqLabel = FREQ_LABELS[frequency] ?? frequency;
    return {
      title: String(s.name ?? '(unnamed)'),
      subtitle: `Paid ${freqLabel}: ${fmt(amount)}`,
      amount: fmt(amount),
      amountLabel: freqLabel,
      badges: s.discretionary ? <PillBadge variant="warning">Discretionary</PillBadge> : undefined,
      isPaused: s.enabled === false,
    };
  },

  'loan': (s) => {
    const monthlyPayment = Number(s.monthlyPayment ?? 0);
    const loanType = String(s.type ?? 'other');
    const paymentLines = parsePaymentLines(s.paymentBreakdown);
    return {
      title: String(s.name ?? '(unnamed)'),
      subtitle: `Monthly payment: ${fmt(monthlyPayment)}`,
      amount: fmt(monthlyPayment),
      amountLabel: 'Monthly',
      badges: <PillBadge variant="outline">{LOAN_TYPE_LABELS[loanType] ?? loanType}</PillBadge>,
      children: paymentLines.length > 0 ? (
        <AmountBreakdown
          items={paymentLines.map((line, index) => {
            const freqLabel = line.frequency ? (FREQ_LABELS[line.frequency] ?? line.frequency) : '';
            const label = freqLabel ? `${line.label} (${freqLabel})` : line.label;
            return {
              id: line.id || `${line.label}-${index}`,
              label,
              amount: line.amount,
            };
          })}
          formatAmount={fmt}
        />
      ) : undefined,
      isPaused: s.enabled === false,
    };
  },

  'savings-contribution': (s, entityNames) => {
    const amount = Number(s.amount ?? 0);
    const frequency = String(s.frequency ?? 'monthly');
    const freqLabel = FREQ_LABELS[frequency] ?? frequency;
    const type = String(s.type ?? 'savings');
    const accountId = typeof s.accountId === 'string' ? s.accountId : '';
    const fromAccount = accountId ? (entityNames[accountId] || accountId) : 'Unknown account';
    return {
      title: String(s.name ?? '(unnamed)'),
      subtitle: `Saved ${freqLabel}: ${fmt(amount)}`,
      amount: fmt(amount),
      amountLabel: freqLabel,
      badges: (
        <>
          <PillBadge variant={type === 'investment' ? 'accent' : 'info'}>
            {type === 'investment' ? 'Investment' : 'Savings'}
          </PillBadge>
          <PillBadge variant="neutral">From {fromAccount}</PillBadge>
        </>
      ),
      isPaused: s.enabled === false,
    };
  },

  'retirement-election': (s) => {
    const type = String(s.type ?? 'other');
    const contrib = Number(s.employeeContribution ?? 0);
    const isPercent = s.employeeContributionIsPercentage === true;
    const isPreTax = s.isPreTax !== false;
    const hasMatch = s.hasEmployerMatch === true;
    const contribDisplay = isPercent ? `${contrib}%` : fmt(contrib);
    return {
      title: (s.customLabel as string | undefined) || RETIREMENT_TYPE_LABELS[type] || type,
      subtitle: `${contribDisplay} contribution per paycheck`,
      amount: contribDisplay,
      amountLabel: 'Per paycheck',
      badges: (
        <>
          <PillBadge variant={isPreTax ? 'success' : 'accent'}>
            {isPreTax ? 'Pre-Tax' : 'Post-Tax'}
          </PillBadge>
          {hasMatch && <PillBadge variant="info">Employer Match</PillBadge>}
        </>
      ),
      isPaused: s.enabled === false,
    };
  },

  'deduction': (s) => {
    const amount = Number(s.amount ?? 0);
    const display = s.isPercentage === true ? `${amount}%` : fmt(amount);
    return {
      title: String(s.name ?? '(unnamed)'),
      subtitle: `Deducted per paycheck: ${display}`,
      amount: display,
      amountLabel: 'Per paycheck',
    };
  },

  'benefit': (s) => {
    const amount = Number(s.amount ?? 0);
    const isTaxable = s.isTaxable === true;
    const display = s.isPercentage === true ? `${amount}%` : fmt(amount);
    return {
      title: String(s.name ?? '(unnamed)'),
      subtitle: `Deducted per paycheck: ${display}`,
      amount: display,
      amountLabel: 'Per paycheck',
      badges: (
        <>
          <PillBadge variant={isTaxable ? 'accent' : 'success'}>
            {isTaxable ? 'Post-Tax' : 'Pre-Tax'}
          </PillBadge>
          {s.discretionary === true && <PillBadge variant="warning">Discretionary</PillBadge>}
        </>
      ),
      isPaused: s.enabled === false,
    };
  },
};

interface HistorySnapshotCardProps {
  entityType: AuditEntityType;
  snapshot: unknown;
  entityNames?: Record<string, string>;
}

const HistorySnapshotCard: React.FC<HistorySnapshotCardProps> = ({
  entityType,
  snapshot,
  entityNames = {},
}) => {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const mapper = SNAPSHOT_MAPPERS[entityType];
  if (!mapper) return null;
  const props = mapper(snapshot as S, entityNames);
  if (!props) return null;
  return <SectionItemCard {...props} hideActions onEdit={NOOP} onDelete={NOOP} />;
};

export default HistorySnapshotCard;
