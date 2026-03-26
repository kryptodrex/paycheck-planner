export type GlossaryCategory =
  | 'pay'
  | 'taxes'
  | 'deductions'
  | 'allocations'
  | 'retirement'
  | 'accounts'
  | 'loans';

export interface GlossaryTerm {
  id: string;
  term: string;
  category: GlossaryCategory;
  shortDefinition: string;
  fullDefinition: string;
  aliases?: string[];
  tags?: string[];
  relatedTermIds?: string[];
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: 'gross-pay',
    term: 'Gross Pay',
    category: 'pay',
    shortDefinition: 'Total earnings before taxes and deductions.',
    fullDefinition:
      'Gross Pay is your total pay before any taxes, deductions, retirement contributions, or other withholdings are subtracted.',
    aliases: ['gross income'],
    tags: ['salary', 'hourly', 'paycheck'],
    relatedTermIds: ['net-pay', 'deduction', 'withholding'],
  },
  {
    id: 'net-pay',
    term: 'Net Pay',
    category: 'pay',
    shortDefinition: 'The take-home amount after all deductions.',
    fullDefinition:
      'Net Pay is the final amount you receive after taxes, deductions, and contributions are taken from gross pay.',
    aliases: ['take-home pay'],
    tags: ['paycheck'],
    relatedTermIds: ['gross-pay', 'deduction', 'allocation'],
  },
  {
    id: 'deduction',
    term: 'Deduction',
    category: 'deductions',
    shortDefinition: 'An amount subtracted from gross pay.',
    fullDefinition:
      'A deduction is any amount taken out of gross pay. Deductions can be pre-tax or post-tax, such as health insurance or wage garnishments.',
    tags: ['pre-tax', 'post-tax'],
    relatedTermIds: ['pre-tax-deduction', 'post-tax-deduction', 'withholding'],
  },
  {
    id: 'pre-tax-deduction',
    term: 'Pre-tax Deduction',
    category: 'deductions',
    shortDefinition: 'Subtracted before taxes are calculated.',
    fullDefinition:
      'Pre-tax deductions reduce taxable income before tax calculations. Common examples include insurance deductions and retirement contributions.',
    tags: ['taxable income'],
    relatedTermIds: ['deduction', 'taxable-income', 'retirement-contribution'],
  },
  {
    id: 'post-tax-deduction',
    term: 'Post-tax Deduction',
    category: 'deductions',
    shortDefinition: 'Subtracted after taxes are calculated.',
    fullDefinition:
      'Post-tax deductions are taken after tax withholding. They do not reduce taxable income.',
    relatedTermIds: ['deduction', 'withholding'],
  },
  {
    id: 'taxable-income',
    term: 'Taxable Income',
    category: 'taxes',
    shortDefinition: 'Income used to calculate tax withholding.',
    fullDefinition:
      'Taxable income is the portion of income subject to tax after applicable pre-tax deductions and adjustments are applied.',
    relatedTermIds: ['gross-pay', 'pre-tax-deduction', 'withholding'],
  },
  {
    id: 'withholding',
    term: 'Withholding',
    category: 'taxes',
    shortDefinition: 'Estimated taxes withheld from each paycheck.',
    fullDefinition:
      'Withholding is the amount your employer sets aside from each paycheck for federal, state, and other payroll taxes.',
    tags: ['federal', 'state', 'payroll'],
    relatedTermIds: ['federal-tax', 'state-tax', 'medicare-tax', 'social-security-tax'],
  },
  {
    id: 'federal-tax',
    term: 'Federal Tax',
    category: 'taxes',
    shortDefinition: 'Income tax withheld for the U.S. federal government.',
    fullDefinition:
      'Federal tax is withheld from your paycheck based on your income, filing details, and withholding settings.',
    tags: ['US-only'],
    relatedTermIds: ['withholding', 'state-tax'],
  },
  {
    id: 'state-tax',
    term: 'State Tax',
    category: 'taxes',
    shortDefinition: 'Income tax withheld for your state (if applicable).',
    fullDefinition:
      'State tax is withheld from your paycheck according to your state tax rules. Some states have no income tax.',
    tags: ['US-only'],
    relatedTermIds: ['withholding', 'federal-tax'],
  },
  {
    id: 'social-security-tax',
    term: 'Social Security Tax',
    category: 'taxes',
    shortDefinition: 'Payroll tax for Social Security programs.',
    fullDefinition:
      'Social Security tax is a payroll tax that funds Social Security benefits, usually calculated as a percentage of eligible wages.',
    aliases: ['OASDI'],
    tags: ['US-only'],
    relatedTermIds: ['medicare-tax', 'withholding'],
  },
  {
    id: 'medicare-tax',
    term: 'Medicare Tax',
    category: 'taxes',
    shortDefinition: 'Payroll tax for Medicare health coverage.',
    fullDefinition:
      'Medicare tax is a payroll tax that supports Medicare. Some incomes may also have an additional Medicare withholding amount.',
    tags: ['US-only'],
    relatedTermIds: ['social-security-tax', 'withholding'],
  },
  {
    id: 'allocation',
    term: 'Allocation',
    category: 'allocations',
    shortDefinition: 'How net pay is distributed across accounts/categories.',
    fullDefinition:
      'An allocation defines where your net pay goes, such as checking, savings, investment accounts, or categories like bills and goals.',
    tags: ['distribution'],
    relatedTermIds: ['net-pay', 'account-priority', 'residual-amount'],
  },
  {
    id: 'account-priority',
    term: 'Account Priority',
    category: 'allocations',
    shortDefinition: 'The funding order used for allocations.',
    fullDefinition:
      'Account priority controls which accounts are funded first when distributing available net pay.',
    tags: ['funding order'],
    relatedTermIds: ['allocation', 'residual-amount'],
  },
  {
    id: 'residual-amount',
    term: 'Residual Amount',
    category: 'allocations',
    shortDefinition: 'Money remaining after configured allocations.',
    fullDefinition:
      'Residual amount is what is left after taxes, deductions, and planned allocations. It can be directed to discretionary spending or additional savings.',
    aliases: ['remainder'],
    relatedTermIds: ['allocation', 'net-pay'],
  },
  {
    id: 'discretionary',
    term: 'Discretionary Expense',
    category: 'allocations',
    shortDefinition: 'Expenses that are optional or flexible.',
    fullDefinition:
      'Bills and deductions can be marked as discretionary. When your remaining for spending amount is below your target, Paycheck Planner can suggest pausing or reducing discretionary items before recommending changes to savings, retirement, or other obligations.',
    aliases: ['optional spending', 'flexible expense', 'discretionary'],
    relatedTermIds: ['allocation', 'residual-amount', 'deduction'],
  },
  {
    id: 'benefit',
    term: 'Insurance Deduction',
    category: 'deductions',
    shortDefinition: 'Amount deducted from pay or an account for insurance and similar programs.',
    fullDefinition:
      'Recurring deductions can include insurance plans and other employer programs. They can be deducted pre-tax or post-tax depending on the deduction type, or paid out of pocket and tracked as an allocation.',
    tags: ['insurance', 'employer', 'deduction'],
    relatedTermIds: ['pre-tax-deduction', 'post-tax-deduction', 'allocation'],
  },
  {
    id: 'retirement-contribution',
    term: 'Retirement Contribution',
    category: 'retirement',
    shortDefinition: 'Amount contributed to a retirement account.',
    fullDefinition:
      'A retirement contribution is money you set aside toward retirement accounts such as a 401(k), 403(b), IRA, or pension plans. It is generally deducted from your paycheck before taxes, but may vary depending on the plan.',
    tags: ['US-only'],
    relatedTermIds: ['pre-tax-deduction', 'annual-contribution-limit'],
  },
  {
    id: 'annual-contribution-limit',
    term: 'Annual Contribution Limit',
    category: 'retirement',
    shortDefinition: 'Maximum allowed yearly retirement contribution.',
    fullDefinition:
      'The annual contribution limit is the maximum amount you can contribute to specific retirement plans in a calendar year, based on applicable rules.',
    relatedTermIds: ['retirement-contribution'],
  },
  {
    id: 'account',
    term: 'Account',
    category: 'accounts',
    shortDefinition: 'A destination for allocated money.',
    fullDefinition:
      'An account is a bucket where funds are tracked, such as checking, savings, or investment accounts, and can be tied to bills and allocations.',
    relatedTermIds: ['allocation', 'account-priority'],
  },
  {
    id: 'loan-principal',
    term: 'Principal',
    category: 'loans',
    shortDefinition: 'The amount borrowed before interest charges.',
    fullDefinition:
      'Principal is the original amount borrowed. As payments are made, part of each payment reduces principal and lowers your remaining balance.',
    relatedTermIds: ['interest-rate-apr', 'amortization-schedule', 'loan-balance'],
  },
  {
    id: 'loan-balance',
    term: 'Loan Balance',
    category: 'loans',
    shortDefinition: 'The amount still owed on the loan.',
    fullDefinition:
      'Loan balance is the unpaid amount remaining. It decreases as principal is paid down over time.',
    relatedTermIds: ['loan-principal', 'amortization-schedule'],
  },
  {
    id: 'interest-rate-apr',
    term: 'Interest Rate (APR)',
    category: 'loans',
    shortDefinition: 'APR is the yearly borrowing cost, including interest and certain loan fees.',
    fullDefinition:
      'APR (annual percentage rate) includes the interest rate plus certain lender fees, so it is often higher than the interest rate alone and is used to compare loan costs.',
    aliases: ['APR'],
    tags: ['annual percentage rate'],
    relatedTermIds: ['loan-principal', 'amortization-schedule', 'loan-payment-split'],
  },
  {
    id: 'loan-payment-split',
    term: 'Payment Split',
    category: 'loans',
    shortDefinition: 'How each payment is divided between principal and interest.',
    fullDefinition:
      'Payment split shows how much of a loan payment goes to principal versus interest (and optional insurance). Early in a loan, interest is often a larger portion.',
    relatedTermIds: ['loan-principal', 'interest-rate-apr', 'amortization-schedule'],
  },
  {
    id: 'amortization-schedule',
    term: 'Amortization Schedule',
    category: 'loans',
    shortDefinition: 'A month-by-month payoff table for a loan.',
    fullDefinition:
      'An amortization schedule is a detailed timeline showing each payment date, beginning balance, payment amount, principal paid, interest paid, and ending balance until payoff.',
    tags: ['payment schedule'],
    relatedTermIds: ['loan-payment-split', 'loan-balance', 'interest-rate-apr'],
  },
  {
    id: 'loan-term',
    term: 'Loan Term',
    category: 'loans',
    shortDefinition: 'The planned duration of the loan.',
    fullDefinition:
      'Loan term is the expected length of repayment, usually in months or years. Longer terms can lower monthly payments but may increase total interest paid.',
    relatedTermIds: ['amortization-schedule', 'interest-rate-apr'],
  },
  {
    id: 'mortgage-insurance',
    term: 'Mortgage/Loan Insurance (PMI/GAP)',
    category: 'loans',
    shortDefinition: 'Insurance that can cover lender risk or loan shortfalls in specific situations.',
    fullDefinition:
      'PMI (private mortgage insurance) typically applies to some mortgages with low down payments and may end once loan-to-value thresholds are met. GAP insurance applies mainly to auto loans and can cover the difference between insurance payout and loan balance after a total loss.',
    aliases: ['PMI', 'GAP'],
    relatedTermIds: ['loan-payment-split', 'loan-balance'],
  },
];

export const glossaryCategoryLabels: Record<GlossaryCategory, string> = {
  pay: 'Pay',
  taxes: 'Taxes',
  deductions: 'Deductions',
  allocations: 'Allocations',
  retirement: 'Retirement',
  accounts: 'Accounts',
  loans: 'Loans',
};
