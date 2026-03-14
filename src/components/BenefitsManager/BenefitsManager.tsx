import React, { useState, useEffect, useRef } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { useAppDialogs } from '../../hooks';
import type { Benefit, RetirementElection } from '../../types/payroll';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { getPaychecksPerYear, getDisplayModeLabel, calculateGrossPayPerPaycheck } from '../../utils/payPeriod';
import { getDefaultAccountIcon } from '../../utils/accountDefaults';
import { getRetirementPlanDisplayLabel, RETIREMENT_PLAN_OPTIONS } from '../../utils/retirement';
import type { ViewMode } from '../../types/viewMode';
import { toDisplayAmount } from '../../utils/displayAmounts';
import { Modal, Button, ConfirmDialog, FormGroup, InputWithPrefix, RadioGroup, SectionItemCard, Alert, ViewModeSelector, PageHeader } from '../shared';
import { GlossaryTerm } from '../Glossary';
import './BenefitsManager.css';

interface BenefitsManagerProps {
    shouldScrollToRetirement?: boolean;
    onScrollToRetirementComplete?: () => void;
    displayMode?: ViewMode;
    onDisplayModeChange?: (mode: ViewMode) => void;
}

type BenefitFieldErrors = {
    name?: string;
    amount?: string;
    sourceAccountId?: string;
};

type RetirementFieldErrors = {
    employeeAmount?: string;
    sourceAccountId?: string;
    employerMatchCap?: string;
    yearlyLimit?: string;
    customLabel?: string;
};

const BenefitsManager: React.FC<BenefitsManagerProps> = ({ 
    shouldScrollToRetirement, 
    onScrollToRetirementComplete,
    displayMode = 'paycheck',
    onDisplayModeChange,
}) => {
    const { budgetData, addBenefit, updateBenefit, deleteBenefit, addRetirementElection, updateRetirementElection, deleteRetirementElection, calculateRetirementContributions } = useBudget();
    const { confirmDialog, openConfirmDialog, closeConfirmDialog, confirmCurrentDialog } = useAppDialogs();
    const [showAddBenefit, setShowAddBenefit] = useState(false);
    const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
    const [showAddRetirement, setShowAddRetirement] = useState(false);
    const [editingRetirement, setEditingRetirement] = useState<RetirementElection | null>(null);
    const scrollCompletedRef = useRef(false);

    // Benefit form state
    const [benefitName, setBenefitName] = useState('');
    const [benefitAmount, setBenefitAmount] = useState('');
    const [benefitIsPercentage, setBenefitIsPercentage] = useState(false);
    const [benefitIsTaxable, setBenefitIsTaxable] = useState(false);
    const [benefitSource, setBenefitSource] = useState<'paycheck' | 'account'>('paycheck');
    const [benefitSourceAccountId, setBenefitSourceAccountId] = useState('');

    // Retirement form state
    const [retirementType, setRetirementType] = useState<RetirementElection['type']>('401k');
    const [retirementCustomLabel, setRetirementCustomLabel] = useState('');
    const [employeeAmount, setEmployeeAmount] = useState('');
    const [employeeIsPercentage, setEmployeeIsPercentage] = useState(true);
    const [retirementSource, setRetirementSource] = useState<'paycheck' | 'account'>('paycheck');
    const [retirementSourceAccountId, setRetirementSourceAccountId] = useState('');
    const [retirementIsPreTax, setRetirementIsPreTax] = useState(true);
    const [employerMatchOption, setEmployerMatchOption] = useState<'no-match' | 'has-match'>('no-match');
    const [employerMatchCap, setEmployerMatchCap] = useState('');
    const [employerMatchCapIsPercentage, setEmployerMatchCapIsPercentage] = useState(true);
    const [yearlyLimit, setYearlyLimit] = useState('');
    const [benefitFieldErrors, setBenefitFieldErrors] = useState<BenefitFieldErrors>({});
    const [retirementFieldErrors, setRetirementFieldErrors] = useState<RetirementFieldErrors>({});
    const [retirementFormMessage, setRetirementFormMessage] = useState<{ type: 'warning' | 'error'; message: string } | null>(null);

    // Scroll to retirement section when shouldScrollToRetirement is true
    useEffect(() => {
        if (shouldScrollToRetirement && !scrollCompletedRef.current) {
            const element = document.getElementById('retirement-section');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                scrollCompletedRef.current = true;
                onScrollToRetirementComplete?.();
            }
        }

        // Reset the ref when shouldScrollToRetirement becomes false
        if (!shouldScrollToRetirement) {
            scrollCompletedRef.current = false;
        }
    }, [shouldScrollToRetirement, onScrollToRetirementComplete]);

    if (!budgetData) return null;

    const currency = budgetData.settings?.currency || 'USD';

    const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);

    // Calculate gross pay per paycheck
    const getGrossPayPerPaycheck = (): number => {
        return calculateGrossPayPerPaycheck(budgetData.paySettings);
    };

    // Convert per-paycheck amount to display mode
    // Calculate yearly retirement contribution (employee + employer)
    const calculateYearlyRetirementContribution = (
        employeeContribAmount: number,
        isPercentage: boolean,
        hasEmployerMatch: boolean,
        employerCapAmount: number,
        employerCapIsPercentage: boolean
    ): number => {
        const grossPayPerPaycheck = getGrossPayPerPaycheck();

        // Calculate contribution per paycheck
        let employeePerPaycheck = 0;
        if (isPercentage) {
            employeePerPaycheck = (grossPayPerPaycheck * employeeContribAmount) / 100;
        } else {
            employeePerPaycheck = employeeContribAmount;
        }

        // Calculate employer match per paycheck (if enabled)
        let employerPerPaycheck = 0;
        if (hasEmployerMatch) {
            const employeePercentage = isPercentage
                ? employeeContribAmount
                : (employeePerPaycheck / grossPayPerPaycheck) * 100;

            if (employerCapIsPercentage) {
                const matchPercentage = Math.min(employeePercentage, employerCapAmount);
                employerPerPaycheck = (grossPayPerPaycheck * matchPercentage) / 100;
            } else {
                employerPerPaycheck = Math.min(employeePerPaycheck, employerCapAmount);
            }
        }

        return (employeePerPaycheck + employerPerPaycheck) * paychecksPerYear;
    };

    // Check if current contribution would exceed yearly limit
    const checkYearlyLimitExceeded = (
        limit: number,
        employeeAmount: number,
        isPercentage: boolean,
        hasEmployerMatch: boolean,
        employerCapAmount: number,
        employerCapIsPercentage: boolean
    ): { exceeded: boolean; total: number; overage: number } => {
        const yearly = calculateYearlyRetirementContribution(
            employeeAmount,
            isPercentage,
            hasEmployerMatch,
            employerCapAmount,
            employerCapIsPercentage
        );
        return {
            exceeded: yearly > limit,
            total: yearly,
            overage: Math.max(0, yearly - limit),
        };
    };

    // Auto-calculate contribution to hit yearly limit exactly
    const handleAutoCalculateYearlyAmount = () => {
        if (!yearlyLimit || parseFloat(yearlyLimit) <= 0) {
            setRetirementFormMessage({
                type: 'warning',
                message: 'Please enter a yearly limit first',
            });
            return;
        }

        const grossPayPerPaycheck = getGrossPayPerPaycheck();
        const yearlyLimitAmount = parseFloat(yearlyLimit);

        // If employer match is enabled, we need to account for it
        if (employerMatchOption === 'has-match') {
            const employerCapAmount = parseFloat(employerMatchCap) || 0;

            // We need to solve: (employeePerPaycheck + employerPerPaycheck) * paychecksPerYear = yearlyLimit
            // This is iterative since employer match depends on employee amount

            let employeePerPaycheck = yearlyLimitAmount / paychecksPerYear * 0.9; // Start with 90% guess
            let iterations = 0;
            const maxIterations = 10;

            while (iterations < maxIterations) {
                const employeePercentage = employeeIsPercentage
                    ? (employeePerPaycheck / grossPayPerPaycheck) * 100
                    : (employeePerPaycheck / grossPayPerPaycheck) * 100;

                let employerPerPaycheck = 0;
                if (employerMatchCapIsPercentage) {
                    const matchPercentage = Math.min(employeePercentage, employerCapAmount);
                    employerPerPaycheck = (grossPayPerPaycheck * matchPercentage) / 100;
                } else {
                    employerPerPaycheck = Math.min(employeePerPaycheck, employerCapAmount);
                }

                const totalPerPaycheck = employeePerPaycheck + employerPerPaycheck;
                const totalYearly = totalPerPaycheck * paychecksPerYear;

                if (Math.abs(totalYearly - yearlyLimitAmount) < 0.01) {
                    // Close enough
                    if (employeeIsPercentage) {
                        setEmployeeAmount(((employeePerPaycheck / grossPayPerPaycheck) * 100).toFixed(2));
                    } else {
                        setEmployeeAmount(employeePerPaycheck.toFixed(2));
                    }
                    setRetirementFormMessage(null);
                    return;
                }

                employeePerPaycheck = employeePerPaycheck * (yearlyLimitAmount / totalYearly);
                iterations++;
            }
        } else {
            // No employer match, simple calculation
            const employeePerPaycheck = yearlyLimitAmount / paychecksPerYear;
            if (employeeIsPercentage) {
                setEmployeeAmount(((employeePerPaycheck / grossPayPerPaycheck) * 100).toFixed(2));
            } else {
                setEmployeeAmount(employeePerPaycheck.toFixed(2));
            }
            setRetirementFormMessage(null);
        }
    };

    const grossPayPerPaycheck = getGrossPayPerPaycheck();

    const getBenefitPerPaycheck = (benefit: Benefit): number => {
        if (benefit.isPercentage) {
            return (grossPayPerPaycheck * benefit.amount) / 100;
        }
        return benefit.amount;
    };

    const sortedBenefits = [...budgetData.benefits].sort(
        (a, b) => getBenefitPerPaycheck(b) - getBenefitPerPaycheck(a)
    );

    const benefitsTotalPerPaycheck = sortedBenefits.reduce(
        (sum, benefit) => sum + getBenefitPerPaycheck(benefit),
        0
    );

    const sortedRetirement = [...(budgetData.retirement || [])].sort((a, b) => {
        const aTotal = calculateRetirementContributions(a).employeeAmount + calculateRetirementContributions(a).employerAmount;
        const bTotal = calculateRetirementContributions(b).employeeAmount + calculateRetirementContributions(b).employerAmount;
        return bTotal - aTotal;
    });

    const retirementTotalPerPaycheck = sortedRetirement.reduce((sum, election) => {
        const { employeeAmount, employerAmount } = calculateRetirementContributions(election);
        return sum + employeeAmount + employerAmount;
    }, 0);

    // Benefit handlers
    const handleAddBenefit = () => {
        setEditingBenefit(null);
        setBenefitName('');
        setBenefitAmount('');
        setBenefitIsPercentage(false);
        setBenefitIsTaxable(false);
        setBenefitSource('paycheck');
        setBenefitSourceAccountId('');
        setBenefitFieldErrors({});
        setShowAddBenefit(true);
    };

    const handleEditBenefit = (benefit: Benefit) => {
        setEditingBenefit(benefit);
        setBenefitName(benefit.name);
        setBenefitAmount(benefit.amount.toString());
        setBenefitIsPercentage(benefit.isPercentage || false);
        setBenefitSource(benefit.deductionSource || 'paycheck');
        setBenefitSourceAccountId(benefit.sourceAccountId || '');
        setBenefitIsTaxable((benefit.deductionSource || 'paycheck') === 'account' ? true : benefit.isTaxable);
        setBenefitFieldErrors({});
        setShowAddBenefit(true);
    };

    const handleSaveBenefit = () => {
        const trimmedBenefitName = benefitName.trim();
        const parsedBenefitAmount = parseFloat(benefitAmount);
        const isAccountSource = benefitSource === 'account';
        const errors: BenefitFieldErrors = {};

        if (!trimmedBenefitName) {
            errors.name = 'Benefit name is required.';
        }

        if (!Number.isFinite(parsedBenefitAmount) || parsedBenefitAmount < 0) {
            errors.amount = 'Please enter a valid benefit amount.';
        }

        if (isAccountSource && !benefitSourceAccountId) {
            errors.sourceAccountId = 'Please select an account for this benefit deduction source.';
        }

        if (Object.keys(errors).length > 0) {
            setBenefitFieldErrors(errors);
            return;
        }

        const benefitData = {
            name: trimmedBenefitName,
            amount: parsedBenefitAmount,
            isTaxable: isAccountSource ? true : benefitIsTaxable,
            isPercentage: benefitIsPercentage,
            deductionSource: benefitSource,
            sourceAccountId: isAccountSource ? benefitSourceAccountId : undefined,
        };

        if (editingBenefit) {
            updateBenefit(editingBenefit.id, benefitData);
        } else {
            addBenefit(benefitData);
        }

        setShowAddBenefit(false);
        setEditingBenefit(null);
        setBenefitFieldErrors({});
    };

    const handleDeleteBenefit = (id: string) => {
        openConfirmDialog({
            title: 'Delete Benefit',
            message: 'Are you sure you want to delete this benefit?',
            confirmLabel: 'Delete Benefit',
            confirmVariant: 'danger',
            onConfirm: () => deleteBenefit(id),
        });
    };

    // Retirement handlers
    const handleAddRetirement = () => {
        setEditingRetirement(null);
        setRetirementType('401k');
        setRetirementCustomLabel('');
        setEmployeeAmount('');
        setEmployeeIsPercentage(true);
        setRetirementSource('paycheck');
        setRetirementSourceAccountId('');
        setRetirementIsPreTax(true);
        setEmployerMatchOption('no-match');
        setEmployerMatchCap('');
        setEmployerMatchCapIsPercentage(true);
        setYearlyLimit('');
        setRetirementFieldErrors({});
        setRetirementFormMessage(null);
        setShowAddRetirement(true);
    };

    const handleEditRetirement = (election: RetirementElection) => {
        setEditingRetirement(election);
        setRetirementType(election.type);
        setRetirementCustomLabel(election.customLabel || '');
        setEmployeeAmount(election.employeeContribution.toString());
        setEmployeeIsPercentage(election.employeeContributionIsPercentage);
        setRetirementSource(election.deductionSource || 'paycheck');
        setRetirementSourceAccountId(election.sourceAccountId || '');
        setRetirementIsPreTax(election.isPreTax !== false);
        setEmployerMatchOption(election.hasEmployerMatch ? 'has-match' : 'no-match');
        setEmployerMatchCap((election.employerMatchCap || 0).toString());
        setEmployerMatchCapIsPercentage(election.employerMatchCapIsPercentage);
        setYearlyLimit((election.yearlyLimit || '').toString());
        setRetirementFieldErrors({});
        setRetirementFormMessage(null);
        setShowAddRetirement(true);
    };

    const handleSaveRetirement = () => {
        const hasEmployerMatch = employerMatchOption === 'has-match';
        const parsedEmployeeContribution = parseFloat(employeeAmount);
        const parsedMatchCap = parseFloat(employerMatchCap);
        const isAccountSource = retirementSource === 'account';
        const parsedYearlyLimit = yearlyLimit ? parseFloat(yearlyLimit) : undefined;
        const errors: RetirementFieldErrors = {};

        if (!Number.isFinite(parsedEmployeeContribution) || parsedEmployeeContribution < 0) {
            errors.employeeAmount = 'Please enter a valid contribution amount.';
        }

        if (retirementType === 'other' && !retirementCustomLabel.trim()) {
            errors.customLabel = 'Please enter a custom plan name for "Other" retirement type.';
        }

        if (isAccountSource && !retirementSourceAccountId) {
            errors.sourceAccountId = 'Please select an account for this retirement deduction source.';
        }

        if (hasEmployerMatch && (!Number.isFinite(parsedMatchCap) || parsedMatchCap < 0)) {
            errors.employerMatchCap = 'Please enter a valid employer match cap.';
        }

        if (yearlyLimit && (!Number.isFinite(parsedYearlyLimit) || (parsedYearlyLimit ?? 0) <= 0)) {
            errors.yearlyLimit = 'Please enter a valid yearly limit greater than zero.';
        }

        if (Object.keys(errors).length > 0) {
            setRetirementFieldErrors(errors);
            setRetirementFormMessage(null);
            return;
        }

        // Check if yearly limit would be exceeded
        if (parsedYearlyLimit && parsedYearlyLimit > 0) {
            const check = checkYearlyLimitExceeded(
                parsedYearlyLimit,
                parsedEmployeeContribution,
                employeeIsPercentage,
                hasEmployerMatch,
                parsedMatchCap || 0,
                employerMatchCapIsPercentage
            );

            if (check.exceeded) {
                setRetirementFormMessage({
                    type: 'error',
                    message: `This contribution would exceed your yearly limit by ${formatWithSymbol(check.overage, currency, { minimumFractionDigits: 2 })}. Total would be ${formatWithSymbol(check.total, currency, { minimumFractionDigits: 2 })} vs limit of ${formatWithSymbol(parsedYearlyLimit, currency, { minimumFractionDigits: 2 })}. Use "Auto-Calculate" to adjust or reduce the amount.`,
                });
                return; // Prevent saving
            }
        }

        const retirementData = {
            type: retirementType,
            customLabel: retirementType === 'other' ? retirementCustomLabel.trim() : undefined,
            employeeContribution: parsedEmployeeContribution,
            employeeContributionIsPercentage: employeeIsPercentage,
            isPreTax: isAccountSource ? false : retirementIsPreTax,
            deductionSource: retirementSource,
            sourceAccountId: isAccountSource ? retirementSourceAccountId : undefined,
            hasEmployerMatch: hasEmployerMatch,
            employerMatchCap: hasEmployerMatch ? (isNaN(parsedMatchCap) ? 0 : parsedMatchCap) : 0,
            employerMatchCapIsPercentage: hasEmployerMatch ? employerMatchCapIsPercentage : false,
            yearlyLimit: parsedYearlyLimit,
        };

        if (editingRetirement) {
            updateRetirementElection(editingRetirement.id, retirementData);
        } else {
            addRetirementElection(retirementData);
        }

        setShowAddRetirement(false);
        setEditingRetirement(null);
        setRetirementFieldErrors({});
        setRetirementFormMessage(null);
    };

    const handleDeleteRetirement = (id: string) => {
        openConfirmDialog({
            title: 'Delete Retirement Election',
            message: 'Are you sure you want to delete this retirement election?',
            confirmLabel: 'Delete Election',
            confirmVariant: 'danger',
            onConfirm: () => deleteRetirementElection(id),
        });
    };

    return (
        <div className="benefits-manager">
            <PageHeader
                title="Benefits & Retirement"
                subtitle="Manage your benefits elections and retirement plan contributions"
                actions={<ViewModeSelector mode={displayMode} onChange={onDisplayModeChange || (() => {})} />}
            />

            {/* Benefits Section */}
            <div className="benefits-section">
                <div className="section-header">
                    <div>
                        <h2><GlossaryTerm termId="benefit">Benefits</GlossaryTerm> Elections</h2>
                        <p>Health insurance, FSA, HSA, and other benefit deductions</p>
                    </div>
                    <div className="section-total">
                        <div>
                            <span className="section-total-label">Total {getDisplayModeLabel(displayMode)}</span>
                            <span className="section-total-amount">
                                {formatWithSymbol(toDisplayAmount(benefitsTotalPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <Button variant="primary" onClick={handleAddBenefit}>
                            + Add Benefit
                        </Button>
                    </div>
                </div>

                {budgetData.benefits.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🏥</div>
                        <h3>No Benefits Yet</h3>
                        <p>Add your benefit elections to get started</p>
                    </div>
                ) : (
                    <div className="benefits-list">
                        {sortedBenefits.map(benefit => {
                            const accountName = benefit.deductionSource === 'account'
                                ? budgetData.accounts.find(acc => acc.id === benefit.sourceAccountId)?.name
                                : null;
                            const benefitPerPaycheck = getBenefitPerPaycheck(benefit);
                            const benefitInDisplayMode = toDisplayAmount(benefitPerPaycheck, paychecksPerYear, displayMode);

                            return (
                                <SectionItemCard key={benefit.id} className="benefit-item">
                                    <div className="benefit-info">
                                        <h4>{benefit.name}</h4>
                                        <span className={`benefit-type ${benefit.deductionSource === 'account' ? 'from-account' : (benefit.isTaxable ? 'post-tax' : 'pre-tax')}`}>
                                            {benefit.deductionSource === 'account' ? `From ${accountName}` : (benefit.isTaxable ? 'Post-Tax' : 'Pre-Tax')}
                                        </span>
                                    </div>
                                    <div className="benefit-amount">
                                        <div className="amount-display">
                                            <span className="amount-label">Per Paycheck:</span>
                                            <span className="amount">
                                                {benefit.isPercentage ? `${benefit.amount}%` : formatWithSymbol(benefitPerPaycheck, currency, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        {displayMode !== 'paycheck' && (
                                            <div className="amount-display">
                                                <span className="amount-label">{getDisplayModeLabel(displayMode)}:</span>
                                                <span className="amount">
                                                    {formatWithSymbol(benefitInDisplayMode, currency, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="benefit-actions">
                                        <Button variant="icon" onClick={() => handleEditBenefit(benefit)} title="Edit">✏️</Button>
                                        <Button variant="icon" onClick={() => handleDeleteBenefit(benefit.id)} title="Delete">🗑️</Button>
                                    </div>
                                </SectionItemCard>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Retirement Section */}
            <div id="retirement-section" className="benefits-section">
                <div className="section-header">
                    <div>
                        <h2><GlossaryTerm termId="retirement-contribution">Retirement</GlossaryTerm> Elections</h2>
                        <p>401k, 403b, IRA, and other retirement plan contributions</p>
                    </div>
                    <div className="section-total">
                        <div>
                            <span className="section-total-label">Total {getDisplayModeLabel(displayMode)}</span>
                            <span className="section-total-amount">
                                {formatWithSymbol(toDisplayAmount(retirementTotalPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <Button variant="primary" onClick={handleAddRetirement}>
                            + Add Retirement Plan
                        </Button>
                    </div>
                </div>

                {!budgetData.retirement || budgetData.retirement.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🏦</div>
                        <h3>No Retirement Plans Yet</h3>
                        <p>Add your retirement plan elections to get started</p>
                    </div>
                ) : (
                    <div className="retirement-list">
                        {sortedRetirement.map(retirement => {
                            const { employeeAmount, employerAmount } = calculateRetirementContributions(retirement);
                            const totalPerPaycheck = employeeAmount + employerAmount;
                            const totalInDisplayMode = toDisplayAmount(totalPerPaycheck, paychecksPerYear, displayMode);
                            const displayLabel = getRetirementPlanDisplayLabel(retirement);

                            return (
                                <SectionItemCard key={retirement.id} className="retirement-item">
                                    <div className="retirement-info">
                                        <h4>{displayLabel}</h4>
                                        <div className="retirement-details">
                                            <div className="detail">
                                                <span className="label"><GlossaryTerm termId="retirement-contribution">Your Contribution</GlossaryTerm>:</span>
                                                <span className="value">
                                                    {formatWithSymbol(employeeAmount || 0, currency, { minimumFractionDigits: 2 })} per paycheck
                                                    {retirement.employeeContributionIsPercentage && ` (${retirement.employeeContribution}%)`}
                                                </span>
                                            </div>
                                            {retirement.hasEmployerMatch && (
                                                <div className="detail">
                                                    <span className="label"><GlossaryTerm termId="employer-match">Employer Match</GlossaryTerm>:</span>
                                                    <span className="value">
                                                        {formatWithSymbol(employerAmount || 0, currency, { minimumFractionDigits: 2 })} per paycheck
                                                        (up to {retirement.employerMatchCapIsPercentage ? `${retirement.employerMatchCap || 0}%` : formatWithSymbol(retirement.employerMatchCap || 0, currency, { minimumFractionDigits: 2 })})
                                                    </span>
                                                </div>
                                            )}
                                            {displayMode !== 'paycheck' && (
                                                <div className="detail" style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', marginTop: '0.75rem' }}>
                                                    <span className="label">Total {getDisplayModeLabel(displayMode)}:</span>
                                                    <span className="value" style={{ fontWeight: '600' }}>
                                                        {formatWithSymbol(totalInDisplayMode, currency, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                            {retirement.yearlyLimit && (
                                                <div className="detail">
                                                    <span className="label"><GlossaryTerm termId="annual-contribution-limit">Yearly Limit</GlossaryTerm>:</span>
                                                    <span className="value">
                                                        {formatWithSymbol(retirement.yearlyLimit, currency, { minimumFractionDigits: 2 })} max per year
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="retirement-actions">
                                        <Button variant="icon" onClick={() => handleEditRetirement(retirement)} title="Edit">✏️</Button>
                                        <Button variant="icon" onClick={() => handleDeleteRetirement(retirement.id)} title="Delete">🗑️</Button>
                                    </div>
                                </SectionItemCard>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Benefit Modal */}
            <Modal
                isOpen={showAddBenefit}
                onClose={() => {
                    setShowAddBenefit(false);
                    setBenefitFieldErrors({});
                }}
                header={editingBenefit ? 'Edit Benefit' : 'Add Benefit'}
                footer={
                    <>
                        <Button type="button" variant="secondary" onClick={() => {
                            setShowAddBenefit(false);
                            setBenefitFieldErrors({});
                        }}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" onClick={handleSaveBenefit}>
                            {editingBenefit ? 'Update Benefit' : 'Add Benefit'}
                        </Button>
                    </>
                }
            >
                <FormGroup label="Benefit Name" required error={benefitFieldErrors.name}>
                    <input
                        type="text"
                        value={benefitName}
                        className={benefitFieldErrors.name ? 'field-error' : ''}
                        onChange={e => {
                            setBenefitName(e.target.value);
                            if (benefitFieldErrors.name) {
                                setBenefitFieldErrors((prev) => ({ ...prev, name: undefined }));
                            }
                        }}
                        placeholder="e.g., Health Insurance, FSA"
                        required
                    />
                </FormGroup>

                <FormGroup label="Deduction Source" error={benefitFieldErrors.sourceAccountId}>
                    <select
                        className={benefitFieldErrors.sourceAccountId ? 'field-error' : ''}
                        value={benefitSource === 'account' ? benefitSourceAccountId : 'paycheck'}
                        onChange={(e) => {
                            if (e.target.value === 'paycheck') {
                                setBenefitSource('paycheck');
                                setBenefitSourceAccountId('');
                            } else {
                                setBenefitSource('account');
                                setBenefitSourceAccountId(e.target.value);
                                setBenefitIsTaxable(true);
                            }
                            if (benefitFieldErrors.sourceAccountId) {
                                setBenefitFieldErrors((prev) => ({ ...prev, sourceAccountId: undefined }));
                            }
                        }}
                    >
                        <option value="paycheck">Paid from Paycheck</option>
                        {budgetData.accounts.map((account) => (
                            <option key={account.id} value={account.id}>{account.icon || getDefaultAccountIcon(account.type)} {account.name}</option>
                        ))}
                    </select>
                </FormGroup>

                <div id="benefit-amount-container" style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                        <FormGroup label="Amount" required error={benefitFieldErrors.amount}>
                            <InputWithPrefix
                                prefix={!benefitIsPercentage ? getCurrencySymbol(currency) : ''}
                                suffix={benefitIsPercentage ? '%' : ''}
                                type="number"
                                value={benefitAmount}
                                className={benefitFieldErrors.amount ? 'field-error' : ''}
                                onChange={e => {
                                    setBenefitAmount(e.target.value);
                                    if (benefitFieldErrors.amount) {
                                        setBenefitFieldErrors((prev) => ({ ...prev, amount: undefined }));
                                    }
                                }}
                                placeholder={benefitIsPercentage ? '0' : '0.00'}
                                step={benefitIsPercentage ? '0.1' : '0.01'}
                                min="0"
                                required
                            />
                        </FormGroup>
                    </div>
                    <div style={{ flex: '0 0 240px' }}>
                        <FormGroup label="Type">
                            <select value={benefitIsPercentage ? 'percentage' : 'amount'} onChange={e => setBenefitIsPercentage(e.target.value === 'percentage')}>
                                <option value="amount">Fixed Amount</option>
                                <option value="percentage">Percentage of Gross</option>
                            </select>
                        </FormGroup>
                    </div>
                </div>

                {benefitSource === 'paycheck' ? (
                    <FormGroup label="Tax Treatment">
                        <RadioGroup
                            name="taxTreatment"
                            value={benefitIsTaxable ? 'post-tax' : 'pre-tax'}
                            onChange={(value) => setBenefitIsTaxable(value === 'post-tax')}
                            layout="column"
                            options={[
                                { value: 'pre-tax', label: 'Pre-Tax', description: 'Reduces taxable income' },
                                { value: 'post-tax', label: 'Post-Tax', description: 'Deducted after taxes' },
                            ]}
                        />
                    </FormGroup>
                ) : (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Account-based deductions are treated as post-tax and will be grouped under the selected account in Pay Breakdown.
                    </p>
                )}
            </Modal>

            {/* Add/Edit Retirement Modal */}
            <Modal
                isOpen={showAddRetirement}
                onClose={() => {
                    setShowAddRetirement(false);
                    setRetirementFieldErrors({});
                    setRetirementFormMessage(null);
                }}
                header={editingRetirement ? 'Edit Retirement Plan' : 'Add Retirement Plan'}
                footer={
                    <>
                        <Button type="button" variant="secondary" onClick={() => {
                            setShowAddRetirement(false);
                            setRetirementFieldErrors({});
                            setRetirementFormMessage(null);
                        }}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" onClick={handleSaveRetirement}>
                            {editingRetirement ? 'Update Plan' : 'Add Plan'}
                        </Button>
                    </>
                }
            >
                <FormGroup label={<><GlossaryTerm termId="retirement-contribution">Plan Type</GlossaryTerm></>} required>
                    <select value={retirementType} onChange={e => setRetirementType(e.target.value as RetirementElection['type'])} required>
                        {RETIREMENT_PLAN_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </FormGroup>

                {retirementType === 'other' && (
                    <FormGroup label="Custom Plan Name" required error={retirementFieldErrors.customLabel}>
                        <input
                            type="text"
                            value={retirementCustomLabel}
                            className={retirementFieldErrors.customLabel ? 'field-error' : ''}
                            onChange={e => {
                                setRetirementCustomLabel(e.target.value);
                                if (retirementFieldErrors.customLabel) {
                                    setRetirementFieldErrors((prev) => ({ ...prev, customLabel: undefined }));
                                }
                            }}
                            placeholder="e.g., 457(b), Solo 401(k), SIMPLE IRA"
                            required
                        />
                    </FormGroup>
                )}

                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h4 style={{ marginTop: 0 }}><GlossaryTerm termId="retirement-contribution">Your Contribution</GlossaryTerm></h4>

                    <FormGroup label="Deduction Source" error={retirementFieldErrors.sourceAccountId}>
                        <select
                            className={retirementFieldErrors.sourceAccountId ? 'field-error' : ''}
                            value={retirementSource === 'account' ? retirementSourceAccountId : 'paycheck'}
                            onChange={(e) => {
                                if (e.target.value === 'paycheck') {
                                    setRetirementSource('paycheck');
                                    setRetirementSourceAccountId('');
                                    setRetirementIsPreTax(true);
                                } else {
                                    setRetirementSource('account');
                                    setRetirementSourceAccountId(e.target.value);
                                    setRetirementIsPreTax(false);
                                }
                                if (retirementFieldErrors.sourceAccountId) {
                                    setRetirementFieldErrors((prev) => ({ ...prev, sourceAccountId: undefined }));
                                }
                            }}
                        >
                            <option value="paycheck">Paid from Paycheck</option>
                            {budgetData.accounts.map((account) => (
                                <option key={account.id} value={account.id}>{account.icon || getDefaultAccountIcon(account.type)} {account.name}</option>
                            ))}
                        </select>
                    </FormGroup>

                    <div id="retirement-amount-container" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <FormGroup label="Amount" required error={retirementFieldErrors.employeeAmount}>
                                <InputWithPrefix
                                    prefix={!employeeIsPercentage ? getCurrencySymbol(currency) : ''}
                                    suffix={employeeIsPercentage ? '%' : ''}
                                    type="number"
                                    value={employeeAmount}
                                    className={retirementFieldErrors.employeeAmount ? 'field-error' : ''}
                                    onChange={e => {
                                        setEmployeeAmount(e.target.value);
                                        if (retirementFieldErrors.employeeAmount) {
                                            setRetirementFieldErrors((prev) => ({ ...prev, employeeAmount: undefined }));
                                        }
                                    }}
                                    placeholder={employeeIsPercentage ? '0' : '0.00'}
                                    step={employeeIsPercentage ? '0.1' : '0.01'}
                                    min="0"
                                    required
                                />
                            </FormGroup>
                        </div>
                        <div style={{ flex: '0 0 240px' }}>
                            <FormGroup label="Type">
                                <select value={employeeIsPercentage ? 'percentage' : 'amount'} onChange={e => setEmployeeIsPercentage(e.target.value === 'percentage')}>
                                    <option value="amount">Fixed Amount</option>
                                    <option value="percentage">Percentage of Gross</option>
                                </select>
                            </FormGroup>
                        </div>
                    </div>

                    {retirementSource === 'paycheck' && (
                        <div style={{ marginTop: '1rem' }}>
                            <FormGroup label={<><GlossaryTerm termId="pre-tax-deduction">Tax Treatment</GlossaryTerm></>}>
                                <RadioGroup
                                    name="taxTreatment"
                                    value={retirementIsPreTax ? 'pre-tax' : 'post-tax'}
                                    onChange={(value) => setRetirementIsPreTax(value === 'pre-tax')}
                                    layout="column"
                                    options={[
                                        { value: 'pre-tax', label: 'Pre-Tax', description: 'Reduces taxable income' },
                                        { value: 'post-tax', label: 'Post-Tax', description: 'Deducted after taxes' },
                                    ]}
                                />
                            </FormGroup>
                        </div>
                    )}

                    {retirementFormMessage && (
                        <Alert type={retirementFormMessage.type}>
                            {retirementFormMessage.message}
                        </Alert>
                    )}

                    {retirementSource === 'account' && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                            Account-based contributions are treated as post-tax and will be grouped under the selected account in Pay Breakdown.
                        </p>
                    )}

                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '1rem' }}><GlossaryTerm termId="annual-contribution-limit">Yearly Limit</GlossaryTerm> (Optional)</h4>
                        <FormGroup label={<><GlossaryTerm termId="annual-contribution-limit">Maximum Yearly Contribution</GlossaryTerm></>} error={retirementFieldErrors.yearlyLimit}>
                            <InputWithPrefix
                                prefix={getCurrencySymbol(currency)}
                                type="number"
                                value={yearlyLimit}
                                className={retirementFieldErrors.yearlyLimit ? 'field-error' : ''}
                                onChange={e => {
                                    setYearlyLimit(e.target.value);
                                    if (retirementFieldErrors.yearlyLimit) {
                                        setRetirementFieldErrors((prev) => ({ ...prev, yearlyLimit: undefined }));
                                    }
                                }}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                            />
                        </FormGroup>

                        {yearlyLimit && parseFloat(yearlyLimit) > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleAutoCalculateYearlyAmount}
                                    style={{ flex: 1 }}
                                >
                                    Auto-Calculate to Limit
                                </Button>
                            </div>
                        )}

                        {yearlyLimit && parseFloat(yearlyLimit) > 0 && (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                                Set a yearly contribution limit and we'll help you auto-calculate the perfect per-paycheck amount to reach it without going over (includes employer match if enabled).
                            </p>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem' }}><GlossaryTerm termId="employer-match">Employer Match</GlossaryTerm> (Optional)</h4>

                    <FormGroup label={<><GlossaryTerm termId="employer-match">Employer Match Availability</GlossaryTerm></>}>
                        <RadioGroup
                            name="employerMatch"
                            value={employerMatchOption}
                            onChange={(value) => setEmployerMatchOption(value as 'no-match' | 'has-match')}
                            layout="column"
                            options={[
                                { value: 'no-match', label: 'Employer does not offer match' },
                                { value: 'has-match', label: 'Employer offers match' },
                            ]}
                        />
                    </FormGroup>

                    {employerMatchOption === 'has-match' && (
                        <>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <FormGroup label={<><GlossaryTerm termId="employer-match">Match Cap</GlossaryTerm></>} required error={retirementFieldErrors.employerMatchCap}>
                                        <InputWithPrefix
                                            prefix={!employerMatchCapIsPercentage ? getCurrencySymbol(currency) : ''}
                                            suffix={employerMatchCapIsPercentage ? '%' : ''}
                                            type="number"
                                            value={employerMatchCap}
                                            className={retirementFieldErrors.employerMatchCap ? 'field-error' : ''}
                                            onChange={e => {
                                                setEmployerMatchCap(e.target.value);
                                                if (retirementFieldErrors.employerMatchCap) {
                                                    setRetirementFieldErrors((prev) => ({ ...prev, employerMatchCap: undefined }));
                                                }
                                            }}
                                            placeholder={employerMatchCapIsPercentage ? '6' : '0.00'}
                                            step={employerMatchCapIsPercentage ? '0.1' : '0.01'}
                                            min="0"
                                            required
                                        />
                                    </FormGroup>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <FormGroup label={<><GlossaryTerm termId="employer-match">Cap Type</GlossaryTerm></>}>
                                        <select value={employerMatchCapIsPercentage ? 'percentage' : 'amount'} onChange={e => setEmployerMatchCapIsPercentage(e.target.value === 'percentage')}>
                                            <option value="percentage">% of Gross Pay</option>
                                            <option value="amount">Fixed Amount</option>
                                        </select>
                                    </FormGroup>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                                Employer will match your contribution up to this cap. For example, if cap is 6% and you contribute 10%, employer matches 6%.
                            </p>
                        </>
                    )}
                </div>
            </Modal>

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

export default BenefitsManager;
