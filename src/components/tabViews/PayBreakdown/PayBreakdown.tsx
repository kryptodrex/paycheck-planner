import React, { useMemo, useState, useRef } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import { useAppDialogs } from '../../../hooks';
import { calculateAnnualizedPayBreakdown, calculateDisplayPayBreakdown } from '../../../services/budgetCalculations';
import { formatWithSymbol, getCurrencySymbol } from '../../../utils/currency';
import { roundToCent, roundUpToCent } from '../../../utils/money';
import { getPaychecksPerYear, getDisplayModeLabel, getPayFrequencyViewMode } from '../../../utils/payPeriod';
import { fromAllocationDisplayAmount, normalizeStoredAllocationAmount, toAllocationDisplayAmount } from '../../../utils/allocationEditor';
import { getBillFrequencyOccurrencesPerYear, getSavingsFrequencyOccurrencesPerYear } from '../../../utils/frequency';
import { getDefaultAccountIcon } from '../../../utils/accountDefaults';
import type { Account } from '../../../types/accounts';
import type { Bill, Loan, SavingsContribution } from '../../../types/obligations';
import type { Benefit, RetirementElection } from '../../../types/payroll';
import type { ViewMode } from '../../../types/viewMode';
import { toDisplayAmount } from '../../../utils/displayAmounts';
import { buildPreTaxLineItems, buildPostTaxLineItems } from '../../../utils/deductionLineItems';
import { applyReallocationPlan, createReallocationPlan, type ReallocationProposal } from '../../../services/reallocationPlanner';
import { Alert, Button, ConfirmDialog, InputWithPrefix, ViewModeSelector, PageHeader, AmountBreakdown, Toast } from '../../_shared';
import PaySettingsModal from '../../modals/PaySettingsModal';
import ReallocationReviewModal from '../../modals/ReallocationReviewModal/ReallocationReviewModal';
import ReallocationSummaryModal, { type ReallocationSummaryItem } from '../../modals/ReallocationSummaryModal/ReallocationSummaryModal';
import { GlossaryTerm } from '../../modals/GlossaryModal';
import '../tabViews.shared.css';
import './PayBreakdown.css';

type AllocationCategory = {
  id: string;
  name: string;
  amount: number;
  isBill?: boolean;        // If true, this is an auto-calculated sum of bills for this account
  billCount?: number;      // Number of bills in this category (if isBill is true)
  isBenefit?: boolean;     // If true, this is an auto-calculated sum of account-sourced benefits
  benefitCount?: number;   // Number of benefits in this category (if isBenefit is true)
  isRetirement?: boolean;  // If true, this is an auto-calculated sum of account-sourced retirement
  retirementCount?: number; // Number of retirement contributions in this category (if isRetirement is true)
  isLoan?: boolean;        // If true, this is an auto-calculated sum of loans for this account
  loanCount?: number;      // Number of loans in this category (if isLoan is true)
  isSavings?: boolean;     // If true, this is an auto-calculated sum of savings/investments for this account
  savingsCount?: number;   // Number of savings/investment items in this category (if isSavings is true)
};

type AllocationAccount = Account & {
  allocationCategories: AllocationCategory[];
};

type AccountFunding = {
  account: AllocationAccount;
  totalAmount: number;
  categories: AllocationCategory[];
};

type ValidationMessage = {
  type: 'error' | 'warning';
  message: string;
};

type ReallocationUndoSnapshot = {
  accounts: Account[];
  bills: Bill[];
  benefits: Benefit[];
  savingsContributions: SavingsContribution[];
  retirement: RetirementElection[];
};

type ReallocationSummaryMeta = {
  appliedCount: number;
  appliedResolved: boolean;
};


const isAutoCategory = (category: AllocationCategory): boolean => {
  return Boolean(category.isBill || category.isBenefit || category.isRetirement || category.isLoan || category.isSavings);
};

const getCategoryItemCount = (category: AllocationCategory): number | null => {
  if (category.isBill && category.billCount && category.billCount > 0) return category.billCount;
  if (category.isBenefit && category.benefitCount && category.benefitCount > 0) return category.benefitCount;
  if (category.isRetirement && category.retirementCount && category.retirementCount > 0) return category.retirementCount;
  if (category.isLoan && category.loanCount && category.loanCount > 0) return category.loanCount;
  if (category.isSavings && category.savingsCount && category.savingsCount > 0) return category.savingsCount;
  return null;
};

interface PayBreakdownProps {
  displayMode: ViewMode;
  onDisplayModeChange: (mode: ViewMode) => void;
  onNavigateToBills?: (accountId: string) => void;
  onNavigateToSavings?: (accountId: string) => void;
  onNavigateToRetirement?: (accountId: string) => void;
  onNavigateToLoans?: (accountId: string) => void;
}

const PayBreakdown: React.FC<PayBreakdownProps> = ({ displayMode, onDisplayModeChange, onNavigateToBills, onNavigateToSavings, onNavigateToRetirement, onNavigateToLoans }) => {
  const { budgetData, calculatePaycheckBreakdown, updateBudgetData } = useBudget();
  const { confirmDialog, openConfirmDialog, closeConfirmDialog, confirmCurrentDialog } = useAppDialogs();
  const [editingAccountIds, setEditingAccountIds] = useState<Set<string>>(new Set());
  const [draftAccounts, setDraftAccounts] = useState<Map<string, AllocationAccount>>(new Map());
  const [validationMessages, setValidationMessages] = useState<Map<string, ValidationMessage>>(new Map());
  const [showPaySettingsModal, setShowPaySettingsModal] = useState(false);
  const [inputValues, setInputValues] = useState<Map<string, number>>(new Map()); // Local input values to prevent conversion flicker
  const [showReallocationModal, setShowReallocationModal] = useState(false);
  const [selectedReallocationIds, setSelectedReallocationIds] = useState<string[]>([]);
  const [showReallocationSummaryModal, setShowReallocationSummaryModal] = useState(false);
  const [reallocationSummaryItems, setReallocationSummaryItems] = useState<ReallocationSummaryItem[]>([]);
  const [selectedReallocationSummaryIds, setSelectedReallocationSummaryIds] = useState<string[]>([]);
  const [reallocationUndoSnapshot, setReallocationUndoSnapshot] = useState<ReallocationUndoSnapshot | null>(null);
  const [reallocationSummaryMeta, setReallocationSummaryMeta] = useState<ReallocationSummaryMeta | null>(null);
  const [lastUndoCount, setLastUndoCount] = useState(0);
  
  const [reallocationToastMessage, setReallocationToastMessage] = useState<string | null>(null);
  const [reallocationToastType, setReallocationToastType] = useState<'success' | 'warning' | 'error'>('success');
  const [reallocationToastKey, setReallocationToastKey] = useState(0);
  // Track if balance has gone negative to prompt for reallocation
  const previousLeftoverRef = useRef<number | null>(null);
  const negativeBalancePromptedRef = useRef(false);
  const suppressNextNegativeBalancePromptRef = useRef(false);

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  // Get per-paycheck breakdown for allocation purposes
  const paycheckBreakdown = calculatePaycheckBreakdown();
  const annualBreakdown = calculateAnnualizedPayBreakdown(paycheckBreakdown, paychecksPerYear);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const normalizedAccounts = useMemo(
    () => normalizeAccounts(budgetData.accounts, budgetData.bills, budgetData.benefits, budgetData.retirement, budgetData.loans, budgetData.savingsContributions || [], budgetData.paySettings.payFrequency, paycheckBreakdown.grossPay),
    [budgetData.accounts, budgetData.bills, budgetData.benefits, budgetData.retirement, budgetData.loans, budgetData.savingsContributions, budgetData.paySettings.payFrequency, paycheckBreakdown.grossPay]
  );
  const allocationPlan = calculateAllocationPlan(normalizedAccounts, paycheckBreakdown.netPay);
  const leftoverPerPaycheck = allocationPlan.remaining;
  const grossPayPerPaycheck = paycheckBreakdown.grossPay;
  const targetLeftoverPerPaycheck = budgetData.paySettings.minLeftover || 0;
  const roundedLeftoverPerPaycheck = roundToCent(leftoverPerPaycheck);
  const roundedTargetLeftoverPerPaycheck = roundToCent(targetLeftoverPerPaycheck);
  const isBelowTarget =
    roundedLeftoverPerPaycheck >= 0
    && roundedTargetLeftoverPerPaycheck > 0
    && roundedLeftoverPerPaycheck < roundedTargetLeftoverPerPaycheck;
  const belowTargetGap = roundToCent(
    Math.max(0, roundedTargetLeftoverPerPaycheck - roundedLeftoverPerPaycheck),
  );

  const customAllocations = buildCustomAllocationItems(budgetData.accounts);

  const reallocationPlan = createReallocationPlan({
    targetRemainingPerPaycheck: targetLeftoverPerPaycheck,
    currentRemainingPerPaycheck: leftoverPerPaycheck,
    grossPayPerPaycheck,
    paychecksPerYear,
    paySettings: budgetData.paySettings,
    preTaxDeductions: budgetData.preTaxDeductions || [],
    bills: budgetData.bills || [],
    benefits: budgetData.benefits || [],
    taxSettings: budgetData.taxSettings,
    savingsContributions: budgetData.savingsContributions || [],
    retirementElections: budgetData.retirement || [],
    accounts: budgetData.accounts,
    customAllocations,
  });

  const selectedReallocationProposals = reallocationPlan.proposals.filter((proposal) =>
    selectedReallocationIds.includes(proposal.sourceId),
  );
  const selectedFreedPerPaycheck = roundToCent(
    selectedReallocationProposals.reduce(
      (sum, proposal) => sum + proposal.freedPerPaycheckAmount,
      0,
    ),
  );
  const selectedProjectedRemaining = roundToCent(
    leftoverPerPaycheck + selectedFreedPerPaycheck,
  );
  const selectedFullyResolved = selectedProjectedRemaining >= targetLeftoverPerPaycheck;

  const displayBreakdown = calculateDisplayPayBreakdown(annualBreakdown, displayMode, paychecksPerYear);

  // Pre-tax and post-tax deduction line items for display in the Gross-to-Net flow
  const preTaxLineItems = buildPreTaxLineItems(
    budgetData.preTaxDeductions || [],
    budgetData.benefits || [],
    budgetData.retirement || [],
    grossPayPerPaycheck,
  );
  const postTaxLineItems = buildPostTaxLineItems(
    budgetData.benefits || [],
    budgetData.retirement || [],
    grossPayPerPaycheck,
  );

  // Calculate percentages for flow details
  const grossPay = displayBreakdown.grossPay;
  const netPct = grossPay > 0 ? (displayBreakdown.netPay / grossPay) * 100 : 0;

  const openReallocationModal = () => {
    setSelectedReallocationIds(reallocationPlan.proposals.map((proposal) => proposal.sourceId));
    setShowReallocationModal(true);
  };

  const closeReallocationModal = () => {
    setShowReallocationModal(false);
  };

  const dismissReallocationFlowAfterUndo = (toastMessage: string) => {
    suppressNextNegativeBalancePromptRef.current = true;
    negativeBalancePromptedRef.current = true;
    setReallocationToastType('warning');
    setReallocationToastMessage(toastMessage);
    setReallocationToastKey((current) => current + 1);
    setShowReallocationSummaryModal(false);
    setReallocationSummaryItems([]);
    setSelectedReallocationSummaryIds([]);
    setReallocationUndoSnapshot(null);
    setReallocationSummaryMeta(null);
    setLastUndoCount(0);
  };

  const getReallocationChangeId = (proposal: ReallocationProposal): string => `${proposal.sourceType}:${proposal.sourceId}`;

  const getSourceTypeLabel = (sourceType: ReallocationProposal['sourceType']): string => {
    switch (sourceType) {
      case 'bill':
        return 'Bill';
      case 'deduction':
        return 'Deduction';
      case 'custom-allocation':
        return 'Custom Allocation';
      case 'savings':
        return 'Savings';
      case 'investment':
        return 'Investment';
      case 'retirement':
        return 'Retirement';
      default:
        return 'Source';
    }
  };

  const getActionLabel = (action: ReallocationProposal['action']): string => {
    switch (action) {
      case 'pause':
        return 'Paused';
      case 'zero':
        return 'Zeroed';
      default:
        return 'Reduced';
    }
  };

  const cloneAccountsForSnapshot = (accounts: Account[]): Account[] =>
    accounts.map((account) => ({
      ...account,
      allocationCategories: (account.allocationCategories || []).map((category) => ({ ...category })),
    }));

  const cloneBillsForSnapshot = (bills: Bill[]): Bill[] => bills.map((bill) => ({ ...bill }));
  const cloneBenefitsForSnapshot = (benefits: Benefit[]): Benefit[] => benefits.map((benefit) => ({ ...benefit }));
  const cloneSavingsForSnapshot = (items: SavingsContribution[]): SavingsContribution[] => items.map((item) => ({ ...item }));
  const cloneRetirementForSnapshot = (items: RetirementElection[]): RetirementElection[] => items.map((item) => ({ ...item }));

  const handleApplyReallocation = () => {
    const beforeSnapshot: ReallocationUndoSnapshot = {
      accounts: cloneAccountsForSnapshot(budgetData.accounts),
      bills: cloneBillsForSnapshot(budgetData.bills || []),
      benefits: cloneBenefitsForSnapshot(budgetData.benefits || []),
      savingsContributions: cloneSavingsForSnapshot(budgetData.savingsContributions || []),
      retirement: cloneRetirementForSnapshot(budgetData.retirement || []),
    };

    const filteredPlan = {
      ...reallocationPlan,
      proposals: selectedReallocationProposals,
      totalFreedPerPaycheck: selectedFreedPerPaycheck,
      projectedRemainingPerPaycheck: selectedProjectedRemaining,
      fullyResolved: selectedFullyResolved,
    };

    const applied = applyReallocationPlan(
      {
        targetRemainingPerPaycheck: targetLeftoverPerPaycheck,
        currentRemainingPerPaycheck: leftoverPerPaycheck,
        grossPayPerPaycheck,
        paychecksPerYear,
        paySettings: budgetData.paySettings,
        preTaxDeductions: budgetData.preTaxDeductions || [],
        bills: budgetData.bills || [],
        benefits: budgetData.benefits || [],
        taxSettings: budgetData.taxSettings,
        savingsContributions: budgetData.savingsContributions || [],
        retirementElections: budgetData.retirement || [],
        accounts: budgetData.accounts,
        customAllocations,
      },
      filteredPlan,
    );

    updateBudgetData({
      accounts: applied.accounts,
      bills: applied.bills,
      benefits: applied.benefits,
      savingsContributions: applied.savingsContributions,
      retirement: applied.retirementElections,
    });

    const summaryItems: ReallocationSummaryItem[] = filteredPlan.proposals.map((proposal) => ({
      id: getReallocationChangeId(proposal),
      label: proposal.label,
      sourceTypeLabel: getSourceTypeLabel(proposal.sourceType),
      actionLabel: getActionLabel(proposal.action),
      beforeLabel: `Before: ${formatWithSymbol(toDisplayAmount(proposal.currentPerPaycheckAmount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getDisplayModeLabel(displayMode).toLowerCase()}`,
      afterLabel: `After: ${formatWithSymbol(toDisplayAmount(proposal.proposedPerPaycheckAmount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getDisplayModeLabel(displayMode).toLowerCase()}`,
      deltaLabel: `+${formatWithSymbol(toDisplayAmount(proposal.freedPerPaycheckAmount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    }));

    const resolutionEpsilon = 0.01;
    const resolvedAfterRounding = roundToCent(filteredPlan.projectedRemainingPerPaycheck) + resolutionEpsilon
      >= roundToCent(targetLeftoverPerPaycheck);

    setReallocationUndoSnapshot(beforeSnapshot);
    setReallocationSummaryItems(summaryItems);
    setSelectedReallocationSummaryIds([]);
    setReallocationSummaryMeta({
      appliedCount: summaryItems.length,
      appliedResolved: resolvedAfterRounding,
    });
    setShowReallocationSummaryModal(true);

    
    setShowReallocationModal(false);
  };

  const handleDismissReallocationSummary = (
    dismissSource: 'done' | 'close',
    summaryCountsOverride?: { appliedCount?: number; remainingCount?: number },
  ) => {
    const appliedCount = summaryCountsOverride?.appliedCount ?? reallocationSummaryMeta?.appliedCount ?? 0;
    const remainingCount = summaryCountsOverride?.remainingCount ?? reallocationSummaryItems.length;
    const undoneCount = Math.max(0, appliedCount - remainingCount);
    const resolutionEpsilon = 0.01;
    const currentlyResolved = roundToCent(leftoverPerPaycheck) + resolutionEpsilon >= roundToCent(targetLeftoverPerPaycheck);

    if (appliedCount > 0) {
      let nextToastMessage: string | null = null;
      let nextToastType: 'success' | 'warning' | 'error' = 'success';

      if (undoneCount === 0) {
        if (dismissSource === 'done') {
          nextToastMessage = currentlyResolved
            ? `Reallocation complete. Applied ${appliedCount} change${appliedCount === 1 ? '' : 's'}.`
            : `Applied ${appliedCount} change${appliedCount === 1 ? '' : 's'}. Remaining is still below target.`;
        } else {
          nextToastMessage = currentlyResolved
            ? `Applied ${appliedCount} change${appliedCount === 1 ? '' : 's'}.`
            : `Applied ${appliedCount} change${appliedCount === 1 ? '' : 's'}. Remaining is still below target.`;
        }
        nextToastType = currentlyResolved ? 'success' : 'warning';
      } else if (remainingCount === 0) {
        nextToastMessage = 'All changes reverted.';
        nextToastType = 'warning';
      } else {
        const revertedCount = lastUndoCount > 0 ? lastUndoCount : undoneCount;
        nextToastMessage = `${revertedCount} selected change(s) reverted.`;
        nextToastType = 'warning';
      }

      if (nextToastMessage) {
        setReallocationToastType(nextToastType);
        setReallocationToastMessage(nextToastMessage);
        setReallocationToastKey((current) => current + 1);
      }
    }

    setShowReallocationSummaryModal(false);
    setReallocationSummaryItems([]);
    setSelectedReallocationSummaryIds([]);
    setReallocationUndoSnapshot(null);
    setReallocationSummaryMeta(null);
    setLastUndoCount(0);
  };

  const handleCompleteReallocationSummary = () => {
    handleDismissReallocationSummary('done');
  };

  const handleCloseReallocationSummary = () => {
    handleDismissReallocationSummary('close');
  };

  const handleUndoReallocationChanges = (idsToUndo: string[]) => {
    if (!reallocationUndoSnapshot || !budgetData) return;
    if (idsToUndo.length === 0) return;
    setLastUndoCount(idsToUndo.length);

    const undoSet = new Set(idsToUndo);
    const getIdForType = (sourceType: string, sourceId: string) => `${sourceType}:${sourceId}`;

    const billBeforeById = new Map(reallocationUndoSnapshot.bills.map((bill) => [bill.id, bill]));
    const benefitBeforeById = new Map(reallocationUndoSnapshot.benefits.map((benefit) => [benefit.id, benefit]));
    const savingsBeforeById = new Map(reallocationUndoSnapshot.savingsContributions.map((item) => [item.id, item]));
    const retirementBeforeById = new Map(reallocationUndoSnapshot.retirement.map((item) => [item.id, item]));
    const accountBeforeById = new Map(reallocationUndoSnapshot.accounts.map((account) => [account.id, account]));

    const nextBills = (budgetData.bills || []).map((bill) => {
      if (!undoSet.has(getIdForType('bill', bill.id))) return bill;
      return billBeforeById.get(bill.id) || bill;
    });

    const nextBenefits = (budgetData.benefits || []).map((benefit) => {
      if (!undoSet.has(getIdForType('deduction', benefit.id))) return benefit;
      return benefitBeforeById.get(benefit.id) || benefit;
    });

    const nextSavings = (budgetData.savingsContributions || []).map((item) => {
      const key = getIdForType(item.type, item.id);
      if (!undoSet.has(key)) return item;
      return savingsBeforeById.get(item.id) || item;
    });

    const nextRetirement = (budgetData.retirement || []).map((item) => {
      if (!undoSet.has(getIdForType('retirement', item.id))) return item;
      return retirementBeforeById.get(item.id) || item;
    });

    const nextAccounts = budgetData.accounts.map((account) => {
      const beforeAccount = accountBeforeById.get(account.id);
      if (!beforeAccount) return account;

      const beforeCategoryById = new Map((beforeAccount.allocationCategories || []).map((category) => [category.id, category]));
      return {
        ...account,
        allocationCategories: (account.allocationCategories || []).map((category) => {
          if (!undoSet.has(getIdForType('custom-allocation', `${account.id}:${category.id}`))) {
            return category;
          }
          return beforeCategoryById.get(category.id) || category;
        }),
      };
    });

    updateBudgetData({
      accounts: nextAccounts,
      bills: nextBills,
      benefits: nextBenefits,
      savingsContributions: nextSavings,
      retirement: nextRetirement,
    });

    const remainingSummaryItems = reallocationSummaryItems.filter((item) => !undoSet.has(item.id));
    const undidAllChanges = remainingSummaryItems.length === 0;
    dismissReallocationFlowAfterUndo(
      undidAllChanges
        ? 'All changes reverted.'
        : `${idsToUndo.length} selected change(s) reverted.`,
    );
  };

  const handleUndoSelectedReallocationChanges = () => {
    handleUndoReallocationChanges(selectedReallocationSummaryIds);
  };

  const handleUndoAllReallocationChanges = () => {
    handleUndoReallocationChanges(reallocationSummaryItems.map((item) => item.id));
  };

  const startAccountEdit = (accountId: string) => {
    const account = normalizedAccounts.find(acc => acc.id === accountId);
    if (account) {
      setDraftAccounts(prev => new Map(prev).set(accountId, { ...account }));
      setEditingAccountIds(prev => new Set(prev).add(accountId));
      // Clear input values when starting fresh edit
      setInputValues(new Map());
      // Clear any existing errors when starting fresh edit
      setValidationMessages(prev => {
        const next = new Map(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const cancelAccountEdit = (accountId: string) => {
    setDraftAccounts(prev => {
      const next = new Map(prev);
      next.delete(accountId);
      return next;
    });
    setEditingAccountIds(prev => {
      const next = new Set(prev);
      next.delete(accountId);
      return next;
    });
    setValidationMessages(prev => {
      const next = new Map(prev);
      next.delete(accountId);
      return next;
    });
    setInputValues(new Map());
  };

  const saveAccountEdit = (accountId: string) => {
    const draftAccount = draftAccounts.get(accountId);
    if (!draftAccount) return;

    const normalizedCategories = draftAccount.allocationCategories
      .map((category) => ({
        ...category,
        name: category.name.trim(),
        amount: normalizeStoredAllocationAmount(category.amount),
      }));

    const incompleteCustomCategories = normalizedCategories.filter(
      (category) => !isAutoCategory(category) && (category.name.length === 0 || category.amount <= 0),
    );

    if (incompleteCustomCategories.length > 0) {
      setValidationMessages((prev) => new Map(prev).set(
        accountId,
        {
          type: 'error',
          message: incompleteCustomCategories.length === 1
            ? 'Complete or remove the custom allocation item before saving.'
            : `Complete or remove all ${incompleteCustomCategories.length} custom allocation items before saving.`,
        },
      ));
      return;
    }

    const cleanedCategories = normalizedCategories
      .filter((category) => category.name.length > 0 && category.amount > 0);

    // Calculate total allocations with the new changes
    const totalAllocations = budgetData.accounts.reduce((sum, account) => {
      if (account.id === accountId) {
        // Use the cleaned categories for this account
        return sum + cleanedCategories.reduce((catSum, cat) => catSum + cat.amount, 0);
      } else {
        // Use existing categories for other accounts
        const existingCategories = account.allocationCategories || [];
        return sum + existingCategories.reduce((catSum, cat) => catSum + cat.amount, 0);
      }
    }, 0);

    const remaining = paycheckBreakdown.netPay - totalAllocations;

    // ERROR: Attempting to allocate more than available (negative remaining)
    if (remaining < 0) {
      const overage = Math.abs(remaining);
      setValidationMessages(prev => new Map(prev).set(
        accountId,
        {
          type: 'error',
          message: `This allocation exceeds your net pay by ${formatWithSymbol(overage, currency, { minimumFractionDigits: 2 })}. Please reduce allocations to stay within ${formatWithSymbol(paycheckBreakdown.netPay, currency, { minimumFractionDigits: 2 })}.`
        }
      ));
      return; // Prevent saving
    }

    // Clear any validation messages for this account
    setValidationMessages(prev => {
      const next = new Map(prev);
      next.delete(accountId);
      return next;
    });

    const updatedAccounts = budgetData.accounts.map((account) => {
      if (account.id !== accountId) return account;
      return {
        ...account,
        allocationCategories: cleanedCategories,
      };
    });

    updateBudgetData({ accounts: updatedAccounts });
    cancelAccountEdit(accountId);
  };

  const addCategory = (accountId: string) => {
    setDraftAccounts((prev) => {
      const account = prev.get(accountId);
      if (!account) return prev;
      const next = new Map(prev);
      next.set(accountId, {
        ...account,
        allocationCategories: [
          ...account.allocationCategories,
          {
            id: crypto.randomUUID(),
            name: '',
            amount: 0,
          },
        ],
      });
      return next;
    });
  };

  const updateCategory = (accountId: string, categoryId: string, updates: Partial<AllocationCategory>) => {
    setDraftAccounts((prev) => {
      const account = prev.get(accountId);
      if (!account) return prev;
      const next = new Map(prev);
      next.set(accountId, {
        ...account,
        allocationCategories: account.allocationCategories.map((category) =>
          category.id === categoryId ? { ...category, ...updates } : category
        ),
      });
      return next;
    });
    // Clear validation messages when user makes changes
    if (validationMessages.has(accountId)) {
      setValidationMessages(prev => {
        const next = new Map(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const removeCategory = (accountId: string, categoryId: string) => {
    setDraftAccounts((prev) => {
      const account = prev.get(accountId);
      if (!account) return prev;
      const next = new Map(prev);
      next.set(accountId, {
        ...account,
        allocationCategories: account.allocationCategories.filter((category) => category.id !== categoryId),
      });
      return next;
    });
  };

  const navigateToCategorySource = (category: AllocationCategory, accountId: string) => {
    if (category.isBill || category.isBenefit) {
      onNavigateToBills?.(accountId);
      return;
    }

    if (category.isRetirement) {
      onNavigateToRetirement?.(accountId);
      return;
    }

    if (category.isLoan) {
      onNavigateToLoans?.(accountId);
      return;
    }

    if (category.isSavings) {
      onNavigateToSavings?.(accountId);
    }
  };

  // Detect when balance transitions to negative and offer reallocation
  // Store previous negative state in a ref to detect transitions
  const handleNegativeBalanceCheck = () => {
    const isCurrentlyNegative = leftoverPerPaycheck < 0;
    const wasNegative = previousLeftoverRef.current !== null && previousLeftoverRef.current < 0;

    if (suppressNextNegativeBalancePromptRef.current) {
      if (!isCurrentlyNegative) {
        suppressNextNegativeBalancePromptRef.current = false;
        negativeBalancePromptedRef.current = false;
      }
      previousLeftoverRef.current = leftoverPerPaycheck;
      return;
    }

    // Suppress prompt churn while the reallocation flow is active (review/summary).
    if (showReallocationModal || showReallocationSummaryModal) {
      if (!isCurrentlyNegative && wasNegative) {
        negativeBalancePromptedRef.current = false;
      }
      previousLeftoverRef.current = leftoverPerPaycheck;
      return;
    }
    
    // If balance just went negative (transition from non-negative to negative)
    if (isCurrentlyNegative && !wasNegative && !negativeBalancePromptedRef.current && reallocationPlan.proposals.length > 0) {
      negativeBalancePromptedRef.current = true;
      openConfirmDialog({
        title: 'Negative Balance Detected',
        message: `Your remaining balance has gone negative. Would you like to review the automated reallocation plan to fix this?`,
        confirmLabel: 'Review Plan',
        cancelLabel: 'Dismiss',
        confirmVariant: 'primary',
        onConfirm: openReallocationModal,
      });
    }
    
    // Reset the prompt flag when balance goes back to non-negative
    if (!isCurrentlyNegative && wasNegative) {
      negativeBalancePromptedRef.current = false;
    }
    
    previousLeftoverRef.current = leftoverPerPaycheck;
  };
  
  // Call the check function during render
  handleNegativeBalanceCheck();

  return (
    <div className="tab-view pay-breakdown">
      <PageHeader
        title="Pay Breakdown"
        subtitle="See where your paycheck goes from gross to net"
        actions={
          <>
            <ViewModeSelector
              mode={displayMode}
              onChange={onDisplayModeChange}
              payCadenceMode={getPayFrequencyViewMode(budgetData.paySettings.payFrequency)}
            />
            <Button variant="secondary" onClick={() => setShowPaySettingsModal(true)}>
              ⚙️ Pay Settings
            </Button>
          </>
        }
      />

      <PaySettingsModal
        isOpen={showPaySettingsModal}
        onClose={() => setShowPaySettingsModal(false)}
      />

      {/* Gross to Net Table */}
      <div className="flow-breakdown">
        <div className="flow-breakdown-header">
          <h3>Gross to Net Breakdown</h3>
        </div>

        <div className="visual-flow">
        <div className="flow-stage">
          <div className="stage-box gross-box">
            <h3><GlossaryTerm termId="gross-pay">Gross Pay</GlossaryTerm></h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.grossPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">
              {budgetData.paySettings.payType === 'salary' 
                ? `${formatWithSymbol(budgetData.paySettings.annualSalary || 0, currency, { maximumFractionDigits: 0 })}/year`
                : `${getCurrencySymbol(currency)}${budgetData.paySettings.hourlyRate}/hr × ${(((budgetData.paySettings.hoursPerPayPeriod || 0) * getPaychecksPerYear(budgetData.paySettings.payFrequency)) / 52).toFixed(2)} hrs/week`
              }
            </div>
          </div>
        </div>

        {displayBreakdown.preTaxDeductions > 0 && (
          <div className="flow-stage">
            <div className="stage-box deduction-box">
              <h3><GlossaryTerm termId="pre-tax-deduction">Pre-Tax Deductions</GlossaryTerm></h3>
              <AmountBreakdown
                items={preTaxLineItems.map(item => ({
                  id: item.id,
                  label: item.label,
                  amount: toDisplayAmount(item.amount, paychecksPerYear, displayMode),
                }))}
                negative
                rowLineLocation="bottom"
                formatAmount={(amount) => formatWithSymbol(amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                className="deduction-breakdown"
              />
              <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.preTaxDeductions, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        )}

        <div className="flow-stage">
          <div className="stage-box taxable-box">
            <h3><GlossaryTerm termId="taxable-income">Taxable Income</GlossaryTerm></h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.taxableIncome, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">Subject to taxes</div>
          </div>
        </div>

        <div className="flow-stage">
          <div className="stage-box taxes-box">
            <h3><GlossaryTerm termId="withholding">Total Taxes</GlossaryTerm></h3>
            <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.totalTaxes, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-breakdown">
              {displayBreakdown.taxLineAmounts.map(line => (
                <div key={line.id} className="breakdown-item">
                  <span>{line.label} ({budgetData.taxSettings.taxLines.find(l => l.id === line.id)?.rate ?? 0}%)</span>
                  <span>{formatWithSymbol(line.amount, currency, { maximumFractionDigits: 2 })}</span>
                </div>
              ))}
              {displayBreakdown.additionalWithholding > 0 && (
                <div className="breakdown-item">
                  <span>Additional Withholding</span>
                  <span>{formatWithSymbol(displayBreakdown.additionalWithholding, currency, { maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
          
        </div>

        {displayBreakdown.postTaxDeductions > 0 && (
          <div className="flow-stage">
            <div className="stage-box postax-box">
              <h3><GlossaryTerm termId="post-tax-deduction">Post-Tax Deductions</GlossaryTerm></h3>
              <AmountBreakdown
                items={postTaxLineItems.map(item => ({
                  id: item.id,
                  label: item.label,
                  amount: toDisplayAmount(item.amount, paychecksPerYear, displayMode),
                }))}
                negative
                formatAmount={(amount) => formatWithSymbol(amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                rowLineLocation="bottom"
                className="deduction-breakdown"
              />
              <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.postTaxDeductions, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        )}

        <div className="flow-stage">
          <div className="stage-box net-box">
            <h3><GlossaryTerm termId="net-pay">Net Pay</GlossaryTerm> (Take Home)</h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.netPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">{netPct.toFixed(1)}% of gross</div>
          </div>
        </div>
        </div>
      </div>

      {/* Waterfall Breakdown with Per-Account Editing */}
      {budgetData.accounts.length > 0 && (
        <div className="waterfall-breakdown">
          <div className="waterfall-header">
            <h3>After-Tax <GlossaryTerm termId="allocation">Allocations</GlossaryTerm></h3>
          </div>
          
          <div className="waterfall-table">
            {/* <div className="waterfall-row waterfall-header-row">
              <span className="waterfall-label">Net Pay</span>
              <span className="waterfall-amount">{formatWithSymbol(displayBreakdown.netPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div> */}

            {allocationPlan.accountFunding.map((fundingItem) => {
              const accountAmount = toDisplayAmount(fundingItem.totalAmount, paychecksPerYear, displayMode);
              const isEditing = editingAccountIds.has(fundingItem.account.id);
              const displayAccount = isEditing ? draftAccounts.get(fundingItem.account.id) : fundingItem.account;
              
              if (!displayAccount) return null;
              
              return (
                <React.Fragment key={fundingItem.account.id}>
                  <div className="waterfall-row waterfall-account-row">
                    <span className="waterfall-label">
                      <span className="account-icon-small">{fundingItem.account.icon || getDefaultAccountIcon(fundingItem.account.type)}</span>
                      Amount from {fundingItem.account.name}
                    </span>
                    {!isEditing ? (
                      <Button className="allocation-secondary-btn" variant="secondary" size="small" onClick={() => startAccountEdit(fundingItem.account.id)}>Edit</Button>
                    ) : null
                    }
                    <span className="waterfall-amount">{formatWithSymbol(accountAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {isEditing ? (
                    <div className="allocation-edit-section">
                      <div className="edit-mode-info">
                        <span className="info-icon">ℹ️</span>
                        <span>Editing amounts for {getDisplayModeLabel(displayMode)} view</span>
                      </div>
                      {displayAccount.allocationCategories.length === 0 && (
                        <div className="waterfall-row waterfall-category-row">
                          <p className="category-empty">No allocations yet. Add allocations to allocate funds to this account.</p>
                        </div>
                      )}

                      {[...displayAccount.allocationCategories].sort((a, b) => b.amount - a.amount).map((category) => {
                        const categoryItemCount = getCategoryItemCount(category);

                        return (
                        <div key={category.id} className={`waterfall-row waterfall-category-row category-edit-row ${isAutoCategory(category) ? 'bill-category-row' : ''}`}>
                          {isAutoCategory(category) ? (
                            <>
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateCategory(displayAccount.id, category.id, { name: e.target.value })}
                                placeholder={category.isBill ? 'Bills category name' : (category.isBenefit ? 'Deductions category name' : (category.isRetirement ? 'Retirement category name' : (category.isLoan ? 'Loan Payments category name' : 'Savings category name')))}
                                className="category-name-input"
                              />
                              <div className="bill-amount-display">
                                {formatWithSymbol(toDisplayAmount(category.amount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                {categoryItemCount && (
                                  <span className="bill-count-badge">{categoryItemCount}</span>
                                )}
                              </div>
                              <div className="category-spacer"></div>
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateCategory(displayAccount.id, category.id, { name: e.target.value })}
                                placeholder="Item name"
                                className="category-name-input"
                              />
                              <InputWithPrefix
                                prefix={getCurrencySymbol(currency)}
                                type="number"
                                min="0"
                                step="0.01"
                                value={String(inputValues.has(category.id) ? inputValues.get(category.id) : toAllocationDisplayAmount(category.amount, paychecksPerYear, displayMode))}
                                onChange={(e) => setInputValues(prev => new Map(prev).set(category.id, parseFloat(e.target.value) || 0))}
                                onBlur={(e) => {
                                  const displayValue = parseFloat(e.target.value) || 0;
                                  updateCategory(displayAccount.id, category.id, { amount: fromAllocationDisplayAmount(displayValue, paychecksPerYear, displayMode) });
                                  setInputValues(prev => {
                                    const next = new Map(prev);
                                    next.delete(category.id);
                                    return next;
                                  });
                                }}
                              />
                              <Button className="category-remove-btn" variant="icon" onClick={() => removeCategory(displayAccount.id, category.id)} title="Remove item">✕</Button>
                            </>
                          )}
                        </div>
                        );
                      })}

                      <div className="waterfall-row waterfall-category-row category-actions-row">
                        <Button style={{ flexGrow: 1 }} className="allocation-secondary-btn" variant="secondary" size="small" onClick={() => addCategory(displayAccount.id)}>+ Add Item</Button>
                        <div className="allocation-edit-actions">
                          <Button className="allocation-secondary-btn" variant="secondary" size="small" onClick={() => cancelAccountEdit(displayAccount.id)}>Cancel</Button>
                          <Button variant="primary" size="small" onClick={() => saveAccountEdit(displayAccount.id)}>Save</Button>
                        </div>
                      </div>

                      {validationMessages.has(displayAccount.id) && (
                        <div className="waterfall-row waterfall-category-row validation-message-row">
                          <Alert type={validationMessages.get(displayAccount.id)?.type}>
                            {validationMessages.get(displayAccount.id)?.type === 'error' ? '🚫' : '⚠️'} {validationMessages.get(displayAccount.id)?.message}
                          </Alert>
                        </div>
                      )}
                    </div>
                  ) : (
                    fundingItem.categories.length > 0 && [...fundingItem.categories].sort((a, b) => b.amount - a.amount).map((category) => {
                      const categoryItemCount = getCategoryItemCount(category);

                      return (
                      <div key={category.id} className={`waterfall-row waterfall-category-row ${isAutoCategory(category) ? 'bill-category-view' : ''}`}>
                        {isAutoCategory(category) ? (
                          <button
                            className="waterfall-label category-label category-button"
                            onClick={() => navigateToCategorySource(category, fundingItem.account.id)}
                          >
                            {categoryItemCount && (
                              <span className="bill-count-badge">{categoryItemCount}</span>
                            )}
                            <span className="category-name-text">{category.name}</span>
                          </button>
                        ) : (
                          <div className="waterfall-label category-label category-name-static">
                            <span className="category-name-text">{category.name}</span>
                          </div>
                        )}
                        <span className="waterfall-amount">
                          {category.amount === 0 ? '-' : formatWithSymbol(toDisplayAmount(category.amount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      );
                    })
                  )}
                </React.Fragment>
              );
            })}

            <div className="waterfall-row waterfall-footer-row">
              <span className="waterfall-label"><GlossaryTerm termId="residual-amount">All that remains</GlossaryTerm> for spending</span>
              <span className="waterfall-amount">{formatWithSymbol(toDisplayAmount(leftoverPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {leftoverPerPaycheck < 0 && (
              <div className="waterfall-alert-row">
                <Alert type="error">
                  <div className="reallocation-alert-content">
                    <span>
                      Your allocations exceed net pay by {formatWithSymbol(toDisplayAmount(Math.abs(leftoverPerPaycheck), paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2 })}.
                    </span>
                    {reallocationPlan.proposals.length > 0 ? (
                      <Button variant="secondary" size="small" onClick={openReallocationModal}>
                        Review Reallocation Plan
                      </Button>
                    ) : (
                      <span className="reallocation-alert-note">
                        No eligible reallocation sources are available yet. Discretionary bills/deductions and custom allocations are checked first, then savings and retirement.
                      </span>
                    )}
                  </div>
                </Alert>
              </div>
            )}
            {isBelowTarget && (
              <div className="waterfall-alert-row">
                <Alert type="warning">
                  <div className="reallocation-alert-content">
                    <span>
                      You are {formatWithSymbol(toDisplayAmount(belowTargetGap, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2 })} below your target minimum of {formatWithSymbol(toDisplayAmount(roundedTargetLeftoverPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2 })}.
                    </span>
                    {reallocationPlan.proposals.length > 0 ? (
                      <Button variant="secondary" size="small" onClick={openReallocationModal}>
                        Review Reallocation Plan
                      </Button>
                    ) : (
                      <span className="reallocation-alert-note">
                        No eligible reallocation sources are available yet. Discretionary bills/deductions and custom allocations are checked first, then savings and retirement.
                      </span>
                    )}
                  </div>
                </Alert>
              </div>
            )}
          </div>
        </div>
      )}

      <ReallocationReviewModal
        isOpen={showReallocationModal}
        onClose={closeReallocationModal}
        onApply={handleApplyReallocation}
        proposals={reallocationPlan.proposals}
        selectedIds={selectedReallocationIds}
        onSelectedIdsChange={setSelectedReallocationIds}
        selectedFullyResolved={selectedFullyResolved}
        selectedProjectedRemaining={selectedProjectedRemaining}
        selectedFreedPerPaycheck={selectedFreedPerPaycheck}
        leftoverPerPaycheck={leftoverPerPaycheck}
        targetLeftoverPerPaycheck={targetLeftoverPerPaycheck}
        currency={currency}
        paychecksPerYear={paychecksPerYear}
        displayMode={displayMode}
        accounts={budgetData.accounts}
        bills={budgetData.bills || []}
        benefits={budgetData.benefits || []}
      />

      <ReallocationSummaryModal
        isOpen={showReallocationSummaryModal}
        onClose={handleCloseReallocationSummary}
        onDone={handleCompleteReallocationSummary}
        items={reallocationSummaryItems}
        selectedIds={selectedReallocationSummaryIds}
        onSelectedIdsChange={setSelectedReallocationSummaryIds}
        onUndoSelected={handleUndoSelectedReallocationChanges}
        onUndoAll={handleUndoAllReallocationChanges}
      />

      <Toast
        key={reallocationToastKey}
        message={reallocationToastMessage}
        type={reallocationToastType}
        duration={3000}
        onDismiss={() => setReallocationToastMessage(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmDialog}
        onClose={closeConfirmDialog}
        onConfirm={confirmCurrentDialog}
        title={confirmDialog?.title || 'Confirm'}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        confirmVariant={confirmDialog?.confirmVariant}
      />
    </div>
  );
};

function calculateBillPerPaycheck(bill: Bill, payFrequency: string): number {
  const paychecksPerYear = getPaychecksPerYear(payFrequency);
  const billsPerYear = getBillFrequencyOccurrencesPerYear(bill.frequency, bill.customFrequencyDays);
  
  // Calculate average per paycheck: (total per year) / (paychecks per year)
  const totalPerYear = bill.amount * billsPerYear;
  return roundUpToCent(totalPerYear / paychecksPerYear);
}

function isAutoCategoryId(categoryId: string): boolean {
  return categoryId.startsWith('__bills_')
    || categoryId.startsWith('__benefits_')
    || categoryId.startsWith('__retirement_')
    || categoryId.startsWith('__loans_')
    || categoryId.startsWith('__savings_');
}

function buildCustomAllocationItems(accounts: Account[]) {
  return accounts.flatMap((account) =>
    (account.allocationCategories || [])
      .filter((category) => !isAutoCategoryId(category.id) && (category.amount || 0) > 0)
      .map((category) => ({
        accountId: account.id,
        categoryId: category.id,
        name: category.name,
        amount: category.amount,
      })),
  );
}

function normalizeAccounts(
  accounts: Account[],
  bills: Bill[],
  benefits: Benefit[],
  retirement: RetirementElection[],
  loans: Loan[],
  savingsContributions: SavingsContribution[],
  payFrequency: string,
  grossPayPerPaycheck: number
): AllocationAccount[] {
  return accounts.map((account) => {
    // Check if there are existing auto-categories with custom names
    const existingBillCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__bills_')
    );
    const existingBenefitCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__benefits_')
    );
    const existingRetirementCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__retirement_')
    );
    const existingSavingsCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__savings_')
    );

    // Get user-defined categories
    const userCategories = (account.allocationCategories || [])
      .filter(cat => !cat.id.startsWith('__bills_') && !cat.id.startsWith('__benefits_') && !cat.id.startsWith('__retirement_') && !cat.id.startsWith('__loans_') && !cat.id.startsWith('__savings_'))
      .map((category) => ({
        id: category.id,
        name: category.name,
        amount: category.amount,
        isBill: false,
        isBenefit: false,
        isRetirement: false,
        isSavings: false,
      }));

    // Get bills for this account and calculate total
    const accountBills = bills.filter(bill => bill.accountId === account.id && bill.enabled !== false);

    // Get account-sourced benefits for this account and calculate total
    const accountBenefits = benefits.filter(
      benefit => benefit.enabled !== false && benefit.deductionSource === 'account' && benefit.sourceAccountId === account.id
    );

    // Get account-sourced retirement contributions for this account and calculate total
    const accountRetirement = retirement.filter(
      election => election.enabled !== false && election.deductionSource === 'account' && election.sourceAccountId === account.id
    );

    // Get account-funded savings/investment contributions for this account
    const accountSavings = savingsContributions.filter(
      item => item.accountId === account.id && item.enabled !== false
    );

    const autoCategories: AllocationCategory[] = [];
    
    if (accountBills.length > 0 || accountBenefits.length > 0) {
      const billTotal = accountBills.reduce((sum, bill) => {
        const billPerPaycheck = calculateBillPerPaycheck(bill, payFrequency);
        return sum + billPerPaycheck;
      }, 0);

      const deductionsTotal = accountBenefits.reduce((sum, benefit) => {
        const amountPerPaycheck = benefit.isPercentage
          ? roundUpToCent((grossPayPerPaycheck * benefit.amount) / 100)
          : roundUpToCent(benefit.amount);
        return sum + amountPerPaycheck;
      }, 0);

      const defaultBillsTitle: string[] = [];
      if (accountBills.length > 0) {
        defaultBillsTitle.push('Bills');
      }
      if (accountBenefits.length > 0) {
        defaultBillsTitle.push('Deductions');
      }
      const defaultBillsName = defaultBillsTitle.join(' & ') || 'Bills';

      autoCategories.push({
        id: `__bills_${account.id}`,
        name: existingBillCategory?.name || existingBenefitCategory?.name || defaultBillsName,
        amount: roundUpToCent(billTotal + deductionsTotal),
        isBill: true,
        billCount: accountBills.length + accountBenefits.length,
      });
    }

    if (accountRetirement.length > 0) {
      const retirementTotal = accountRetirement.reduce((sum, election) => {
        const amountPerPaycheck = election.employeeContributionIsPercentage
          ? roundToCent((grossPayPerPaycheck * election.employeeContribution) / 100)
          : roundToCent(election.employeeContribution);
        return sum + amountPerPaycheck;
      }, 0);

      autoCategories.push({
        id: `__retirement_${account.id}`,
        name: existingRetirementCategory?.name || 'Retirement Plans',
        amount: roundUpToCent(retirementTotal),
        isRetirement: true,
        retirementCount: accountRetirement.length,
      });
    }

    if (accountSavings.length > 0) {
      const paychecksPerYear = getPaychecksPerYear(payFrequency);
      const savingsTotal = accountSavings.reduce((sum, item) => {
        const occurrencesPerYear = getSavingsFrequencyOccurrencesPerYear(item.frequency);
        const perPaycheck = occurrencesPerYear === paychecksPerYear
          ? roundUpToCent(item.amount)
          : roundUpToCent((item.amount * occurrencesPerYear) / paychecksPerYear);
        return sum + perPaycheck;
      }, 0);

      // Set a default title based on if there are savings, investments, or both
      const defaultSavingsTitle: string[] = [];
      if (accountSavings.some((s) => s.type === 'savings')) {
        defaultSavingsTitle.push('Savings');
      }
      if (accountSavings.some((s) => s.type === 'investment')) {
        defaultSavingsTitle.push('Investment');
      }
      const defaultSavingsName = defaultSavingsTitle.join(' & ');

      autoCategories.push({
        id: `__savings_${account.id}`,
        name: existingSavingsCategory?.name || defaultSavingsName + ' Contributions',
        amount: roundUpToCent(savingsTotal),
        isSavings: true,
        savingsCount: accountSavings.length,
      });
    }

    // Get loans for this account and calculate total
    const accountLoans = loans.filter(loan => loan.accountId === account.id && loan.enabled !== false);
    const existingLoanCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__loans_')
    );

    if (accountLoans.length > 0) {
      const paychecksPerYear = getPaychecksPerYear(payFrequency);
      const loanTotal = accountLoans.reduce((sum, loan) => {
        const perPaycheckAmount = (loan.monthlyPayment * 12) / paychecksPerYear;
        return sum + perPaycheckAmount;
      }, 0);

      autoCategories.push({
        id: `__loans_${account.id}`,
        name: existingLoanCategory?.name || 'Loan Payments',
        amount: roundUpToCent(loanTotal),
        isLoan: true,
        loanCount: accountLoans.length,
      });
    }

    return {
      ...account,
      allocationCategories: [...userCategories, ...autoCategories],
    };
  });
}


function calculateAllocationPlan(accounts: AllocationAccount[], netPay: number): { accountFunding: AccountFunding[]; remaining: number } {
  const accountFunding: AccountFunding[] = accounts.map((account) => {
    const categories = account.allocationCategories.map((category) => ({
      id: category.id,
      name: category.name,
      amount: Math.max(0, category.amount || 0),
      isBill: category.isBill,
      billCount: category.billCount,
      isBenefit: category.isBenefit,
      benefitCount: category.benefitCount,
      isRetirement: category.isRetirement,
      retirementCount: category.retirementCount,
      isLoan: category.isLoan,
      loanCount: category.loanCount,
      isSavings: category.isSavings,
      savingsCount: category.savingsCount,
    }));

    const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);

    return {
      account,
      totalAmount,
      categories,
    };
  });

  const totalAllocated = accountFunding.reduce((sum, item) => sum + item.totalAmount, 0);
  const remaining = netPay - totalAllocated;

  return {
    accountFunding,
    remaining,
  };
}

export default PayBreakdown;
