export const LOAN_TYPE_METADATA = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'auto', label: 'Auto Loan' },
  { value: 'student', label: 'Student Loan' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
] as const;

export type LoanType = (typeof LOAN_TYPE_METADATA)[number]['value'];

export const LOAN_TYPE_LABELS: Record<LoanType, string> = Object.fromEntries(
  LOAN_TYPE_METADATA.map((m) => [m.value, m.label]),
) as Record<LoanType, string>;
