import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  convertBillToMonthly,
  formatBillFrequency,
  getAccountNameById,
  getOtherIncomeOccurrencesPerYear,
  getRetirementLabel,
  LOAN_TYPE_LABELS,
  type Benefit,
  type Bill,
  type Deduction,
  type Loan,
  type OtherIncome,
  type RetirementElection,
  type SavingsContribution,
} from '@paycheck-planner/core';
import { usePlanScreen } from '../../src/hooks/usePlanScreen';
import { useHighlightParam } from '../../src/hooks/useHighlightParam';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PlanTabScreen } from '../../src/components/PlanTabScreen';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { SectionCard } from '../../src/components/SectionCard';
import { ItemCard } from '../../src/components/ItemCard';
import { EmptyState } from '../../src/components/EmptyState';
import { BillFormSheet } from '../../src/features/money/BillFormSheet';
import { BenefitFormSheet } from '../../src/features/money/BenefitFormSheet';
import { DeductionFormSheet } from '../../src/features/pay/DeductionFormSheet';
import { LoanFormSheet } from '../../src/features/money/LoanFormSheet';
import { SavingsFormSheet } from '../../src/features/money/SavingsFormSheet';
import { RetirementFormSheet } from '../../src/features/money/RetirementFormSheet';
import { OtherIncomeFormSheet } from '../../src/features/money/OtherIncomeFormSheet';
import { upsertById, removeById, setEnabledById } from '../../src/utils/planMutations';
import { OTHER_INCOME_TYPE_OPTIONS } from '../../src/utils/formOptions';

type MoneySection = 'bills' | 'loans' | 'savings' | 'income';

const SECTION_OPTIONS: { value: MoneySection; label: string }[] = [
  { value: 'bills', label: 'Bills' },
  { value: 'loans', label: 'Loans' },
  { value: 'savings', label: 'Savings' },
  { value: 'income', label: 'Income' },
];

type ActiveSheet =
  | { kind: 'bill'; item: Bill | null }
  | { kind: 'benefit'; item: Benefit | null }
  | { kind: 'pretax-deduction'; item: Deduction | null }
  | { kind: 'loan'; item: Loan | null }
  | { kind: 'savings'; item: SavingsContribution | null }
  | { kind: 'retirement'; item: RetirementElection | null }
  | { kind: 'other-income'; item: OtherIncome | null }
  | null;

const isMoneySection = (value: unknown): value is MoneySection =>
  SECTION_OPTIONS.some((option) => option.value === value);

const SECTION_ADD_SHEET: Record<MoneySection, ActiveSheet> = {
  bills: { kind: 'bill', item: null },
  loans: { kind: 'loan', item: null },
  savings: { kind: 'savings', item: null },
  income: { kind: 'other-income', item: null },
};

export default function MoneyScreen() {
  const helpers = usePlanScreen();
  const { spacing } = useTheme();
  const params = useLocalSearchParams<{ section?: string; highlight?: string; action?: string }>();
  const [section, setSection] = useState<MoneySection>(
    isMoneySection(params.section) ? params.section : 'bills',
  );
  const [sheet, setSheet] = useState<ActiveSheet>(null);
  const highlightId = useHighlightParam(params.highlight);

  // Honor section / "add" deep-links (e.g. from search) when params change after
  // mount — state is adjusted during render instead of in an effect.
  const navKey = `${params.section ?? ''}|${params.action ?? ''}`;
  const [appliedNavKey, setAppliedNavKey] = useState(navKey);
  if (navKey !== appliedNavKey) {
    setAppliedNavKey(navKey);
    const nextSection = isMoneySection(params.section) ? params.section : section;
    if (isMoneySection(params.section)) setSection(params.section);
    if (params.action === 'add') setSheet(SECTION_ADD_SHEET[nextSection]);
  }

  if (!helpers) return null;

  const { plan, updatePlan, fmt } = helpers;
  const accounts = plan.accounts;

  const incomeTypeLabel = (income: OtherIncome) =>
    OTHER_INCOME_TYPE_OPTIONS.find((o) => o.value === income.incomeType)?.label ?? 'Other';

  return (
    <PlanTabScreen title="Money" subtitle={plan.name}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <SegmentedControl options={SECTION_OPTIONS} value={section} onChange={setSection} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        {section === 'bills' && (
          <>
            {/* Deductions (pre-tax + post-tax) — above Bills, mirroring desktop */}
            <SectionCard
              title="Deductions"
              actionLabel="Add"
              onAction={() => setSheet({ kind: 'benefit', item: null })}
            >
              {plan.preTaxDeductions.length === 0 && plan.benefits.length === 0 ? (
                <EmptyState
                  icon="minus-circle"
                  title="No deductions"
                  message="Track pre-tax (401k, HSA, insurance) and post-tax deductions taken from your pay."
                />
              ) : (
                <>
                  {plan.preTaxDeductions.map((deduction) => (
                    <ItemCard
                      key={deduction.id}
                      highlighted={highlightId === deduction.id}
                      title={deduction.name}
                      subtitle="Pre-tax"
                      amount={deduction.isPercentage ? `${deduction.amount}%` : fmt(deduction.amount)}
                      amountCaption={deduction.isPercentage ? 'of gross' : 'per check'}
                      onPress={() => setSheet({ kind: 'pretax-deduction', item: deduction })}
                    />
                  ))}
                  {plan.benefits.map((benefit) => (
                    <ItemCard
                      key={benefit.id}
                      highlighted={highlightId === benefit.id}
                      title={benefit.name}
                      subtitle={benefit.isTaxable ? 'Post-tax' : 'Pre-tax'}
                      amount={benefit.isPercentage ? `${benefit.amount}%` : fmt(benefit.amount)}
                      amountCaption={benefit.isPercentage ? 'of gross' : 'per check'}
                      enabled={benefit.enabled !== false}
                      onToggle={(enabled) =>
                        updatePlan((p) => ({ ...p, benefits: setEnabledById(p.benefits, benefit.id, enabled) }), {
                          description: enabled ? 'Enable deduction' : 'Pause deduction',
                        })
                      }
                      onPress={() => setSheet({ kind: 'benefit', item: benefit })}
                    />
                  ))}
                </>
              )}
            </SectionCard>

            <SectionCard
              title="Bills"
              actionLabel="Add"
              onAction={() => setSheet({ kind: 'bill', item: null })}
            >
              {plan.bills.length === 0 ? (
                <EmptyState icon="file-text" title="No bills yet" message="Add your recurring bills to plan each paycheck." />
              ) : (
                plan.bills.map((bill) => (
                  <ItemCard
                    key={bill.id}
                    highlighted={highlightId === bill.id}
                    title={bill.name}
                    subtitle={`${getAccountNameById(accounts, bill.accountId)}${bill.discretionary ? ' · Discretionary' : ''}`}
                    amount={fmt(bill.amount)}
                    amountCaption={formatBillFrequency(bill.frequency)}
                    enabled={bill.enabled !== false}
                    onToggle={(enabled) =>
                      updatePlan((p) => ({ ...p, bills: setEnabledById(p.bills, bill.id, enabled) }), {
                        description: enabled ? 'Enable bill' : 'Pause bill',
                      })
                    }
                    onPress={() => setSheet({ kind: 'bill', item: bill })}
                  />
                ))
              )}
            </SectionCard>
          </>
        )}

        {section === 'loans' && (
          <SectionCard
            title="Loans"
            actionLabel="Add"
            onAction={() => setSheet({ kind: 'loan', item: null })}
          >
            {(plan.loans ?? []).length === 0 ? (
              <EmptyState icon="home" title="No loans" message="Track mortgages, auto loans, and other debt payments." />
            ) : (
              plan.loans.map((loan) => (
                <ItemCard
                  key={loan.id}
                  highlighted={highlightId === loan.id}
                  title={loan.name}
                  subtitle={`${LOAN_TYPE_LABELS[loan.type] ?? 'Loan'} · ${getAccountNameById(accounts, loan.accountId)}`}
                  amount={fmt(loan.monthlyPayment)}
                  amountCaption="per month"
                  enabled={loan.enabled !== false}
                  onToggle={(enabled) =>
                    updatePlan((p) => ({ ...p, loans: setEnabledById(p.loans, loan.id, enabled) }), {
                      description: enabled ? 'Enable loan' : 'Pause loan',
                    })
                  }
                  onPress={() => setSheet({ kind: 'loan', item: loan })}
                />
              ))
            )}
          </SectionCard>
        )}

        {section === 'savings' && (
          <>
            <SectionCard
              title="Savings Contributions"
              actionLabel="Add"
              onAction={() => setSheet({ kind: 'savings', item: null })}
            >
              {(plan.savingsContributions ?? []).length === 0 ? (
                <EmptyState icon="trending-up" title="No savings contributions" message="Set up recurring transfers to savings or investments." />
              ) : (
                (plan.savingsContributions ?? []).map((item) => (
                  <ItemCard
                    key={item.id}
                    highlighted={highlightId === item.id}
                    title={item.name}
                    subtitle={`${getAccountNameById(accounts, item.accountId)} · ${fmt(convertBillToMonthly(item.amount, item.frequency))}/mo`}
                    amount={fmt(item.amount)}
                    amountCaption={formatBillFrequency(item.frequency)}
                    badge={item.reallocationProtected ? 'Protected' : undefined}
                    enabled={item.enabled !== false}
                    onToggle={(enabled) =>
                      updatePlan(
                        (p) => ({
                          ...p,
                          savingsContributions: setEnabledById(p.savingsContributions, item.id, enabled),
                        }),
                        { description: enabled ? 'Enable savings contribution' : 'Pause savings contribution' },
                      )
                    }
                    onPress={() => setSheet({ kind: 'savings', item })}
                  />
                ))
              )}
            </SectionCard>

            <SectionCard
              title="Retirement"
              actionLabel="Add"
              onAction={() => setSheet({ kind: 'retirement', item: null })}
            >
              {plan.retirement.length === 0 ? (
                <EmptyState icon="sunrise" title="No retirement elections" message="Add 401(k), IRA, or pension contributions." />
              ) : (
                plan.retirement.map((election) => (
                  <ItemCard
                    key={election.id}
                    highlighted={highlightId === election.id}
                    title={getRetirementLabel(election)}
                    subtitle={`${election.isPreTax === false ? 'Post-tax' : 'Pre-tax'}${election.hasEmployerMatch ? ' · Employer match' : ''}`}
                    amount={
                      election.employeeContributionIsPercentage
                        ? `${election.employeeContribution}%`
                        : fmt(election.employeeContribution)
                    }
                    amountCaption={election.employeeContributionIsPercentage ? 'of gross' : 'per check'}
                    badge={election.reallocationProtected ? 'Protected' : undefined}
                    enabled={election.enabled !== false}
                    onToggle={(enabled) =>
                      updatePlan((p) => ({ ...p, retirement: setEnabledById(p.retirement, election.id, enabled) }), {
                        description: enabled ? 'Enable retirement election' : 'Pause retirement election',
                      })
                    }
                    onPress={() => setSheet({ kind: 'retirement', item: election })}
                  />
                ))
              )}
            </SectionCard>
          </>
        )}

        {section === 'income' && (
          <SectionCard
            title="Other Income"
            actionLabel="Add"
            onAction={() => setSheet({ kind: 'other-income', item: null })}
          >
            {(plan.otherIncome ?? []).length === 0 ? (
              <EmptyState icon="gift" title="No other income" message="Track bonuses, commissions, rental income, and more." />
            ) : (
              (plan.otherIncome ?? []).map((income) => (
                <ItemCard
                  key={income.id}
                  highlighted={highlightId === income.id}
                  title={income.name}
                  subtitle={`${incomeTypeLabel(income)} · ${getOtherIncomeOccurrencesPerYear(income.frequency)}× per year`}
                  amount={
                    income.amountMode === 'percent-of-gross'
                      ? `${income.percentOfGross ?? 0}%`
                      : fmt(income.amount)
                  }
                  amountCaption={income.amountMode === 'percent-of-gross' ? 'of gross' : formatBillFrequency(income.frequency)}
                  enabled={income.enabled !== false}
                  onToggle={(enabled) =>
                    updatePlan((p) => ({ ...p, otherIncome: setEnabledById(p.otherIncome, income.id, enabled) }), {
                      description: enabled ? 'Enable other income' : 'Pause other income',
                    })
                  }
                  onPress={() => setSheet({ kind: 'other-income', item: income })}
                />
              ))
            )}
          </SectionCard>
        )}
      </ScrollView>

      {/* Edit sheets — mounted only while open so each opens with fresh state */}
      {sheet?.kind === 'bill' && (
        <BillFormSheet
          bill={sheet.item}
          accounts={accounts}
          onSave={(bill) =>
            updatePlan((p) => ({ ...p, bills: upsertById(p.bills, bill) }), {
              description: sheet.item ? 'Edit bill' : 'Add bill',
            })
          }
          onDelete={(id) =>
            updatePlan((p) => ({ ...p, bills: removeById(p.bills, id) }), { description: 'Delete bill' })
          }
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'benefit' && (
        <BenefitFormSheet
          benefit={sheet.item}
          accounts={accounts}
          onSave={(benefit) =>
            updatePlan((p) => ({ ...p, benefits: upsertById(p.benefits, benefit) }), {
              description: sheet.item ? 'Edit deduction' : 'Add deduction',
            })
          }
          onDelete={(id) =>
            updatePlan((p) => ({ ...p, benefits: removeById(p.benefits, id) }), { description: 'Delete deduction' })
          }
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'pretax-deduction' && (
        <DeductionFormSheet
          deduction={sheet.item}
          onSave={(deduction) =>
            updatePlan((p) => ({ ...p, preTaxDeductions: upsertById(p.preTaxDeductions, deduction) }), {
              description: sheet.item ? 'Edit deduction' : 'Add deduction',
            })
          }
          onDelete={(id) =>
            updatePlan((p) => ({ ...p, preTaxDeductions: removeById(p.preTaxDeductions, id) }), {
              description: 'Delete deduction',
            })
          }
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'loan' && (
        <LoanFormSheet
          loan={sheet.item}
          accounts={accounts}
          onSave={(loan) =>
            updatePlan((p) => ({ ...p, loans: upsertById(p.loans, loan) }), {
              description: sheet.item ? 'Edit loan' : 'Add loan',
            })
          }
          onDelete={(id) =>
            updatePlan((p) => ({ ...p, loans: removeById(p.loans, id) }), { description: 'Delete loan' })
          }
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'savings' && (
        <SavingsFormSheet
          contribution={sheet.item}
          accounts={accounts}
          onSave={(item) =>
            updatePlan(
              (p) => ({ ...p, savingsContributions: upsertById(p.savingsContributions, item) }),
              { description: sheet.item ? 'Edit savings contribution' : 'Add savings contribution' },
            )
          }
          onDelete={(id) =>
            updatePlan(
              (p) => ({ ...p, savingsContributions: removeById(p.savingsContributions, id) }),
              { description: 'Delete savings contribution' },
            )
          }
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'retirement' && (
        <RetirementFormSheet
          election={sheet.item}
          accounts={accounts}
          onSave={(election) =>
            updatePlan((p) => ({ ...p, retirement: upsertById(p.retirement, election) }), {
              description: sheet.item ? 'Edit retirement election' : 'Add retirement election',
            })
          }
          onDelete={(id) =>
            updatePlan((p) => ({ ...p, retirement: removeById(p.retirement, id) }), {
              description: 'Delete retirement election',
            })
          }
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'other-income' && (
        <OtherIncomeFormSheet
          income={sheet.item}
          onSave={(income) =>
            updatePlan((p) => ({ ...p, otherIncome: upsertById(p.otherIncome, income) }), {
              description: sheet.item ? 'Edit other income' : 'Add other income',
            })
          }
          onDelete={(id) =>
            updatePlan((p) => ({ ...p, otherIncome: removeById(p.otherIncome, id) }), {
              description: 'Delete other income',
            })
          }
          onClose={() => setSheet(null)}
        />
      )}
    </PlanTabScreen>
  );
}
