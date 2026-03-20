import React, { useEffect, useRef, useState } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import { formatWithSymbol, getCurrencySymbol } from '../../../utils/currency';
import { getPaychecksPerYear, convertToDisplayMode, getDisplayModeLabel } from '../../../utils/payPeriod';
import { Button, InputWithPrefix, Modal, FormGroup, PageHeader, TaxLinesEditor, InfoBox } from '../../_shared';
import { GlossaryTerm } from '../../modals/GlossaryModal';
import type { TaxLine } from '../../../types/payroll';
import type { ViewMode } from '../../../types/viewMode';
import {
    type EditableTaxLineValues,
    getTaxableIncomeForTaxLine,
    getTaxLineCalculationType,
    toEditableTaxLineValues,
    toStoredTaxLine,
    validateEditableTaxLineValues,
    syncEditableTaxLineValues,
} from '../../../utils/taxLines';
import '../tabViews.shared.css';
import './TaxBreakdown.css';

interface TaxBreakdownProps {
    searchOpenSettingsRequestKey?: number;
    displayMode: ViewMode;
}

const TaxBreakdown: React.FC<TaxBreakdownProps> = ({ searchOpenSettingsRequestKey, displayMode }) => {
    const { budgetData, calculatePaycheckBreakdown, updateBudgetData } = useBudget();
    const [showEditModal, setShowEditModal] = useState(false);
    const [editLines, setEditLines] = useState<EditableTaxLineValues[]>([]);
    const [additionalWithholding, setAdditionalWithholding] = useState('0');
    const [additionalWithholdingError, setAdditionalWithholdingError] = useState<string | undefined>();
    const lastHandledSearchOpenSettingsRef = useRef(0);

    const currency = budgetData?.settings?.currency || 'USD';
    const breakdown = budgetData
        ? calculatePaycheckBreakdown()
        : {
            grossPay: 0,
            preTaxDeductions: 0,
            taxableIncome: 0,
            taxLineAmounts: [],
            additionalWithholding: 0,
            totalTaxes: 0,
            netPay: 0,
        };
    const taxSettings = budgetData?.taxSettings ?? { taxLines: [], additionalWithholding: 0 };
    const paychecksPerYear = budgetData ? getPaychecksPerYear(budgetData.paySettings.payFrequency) : 1;
    const taxableIncomeForEditor = breakdown.taxableIncome;

    useEffect(() => {
        if (!budgetData) {
            return;
        }

        if (!searchOpenSettingsRequestKey || searchOpenSettingsRequestKey === lastHandledSearchOpenSettingsRef.current) {
            return;
        }

        lastHandledSearchOpenSettingsRef.current = searchOpenSettingsRequestKey;
        const timeoutId = window.setTimeout(() => {
            setEditLines(
                (taxSettings.taxLines || []).map(line => ({
                    ...toEditableTaxLineValues(line, taxableIncomeForEditor),
                }))
            );
            setAdditionalWithholding(String(taxSettings.additionalWithholding ?? 0));
            setAdditionalWithholdingError(undefined);
            setShowEditModal(true);
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [budgetData, searchOpenSettingsRequestKey, taxSettings.additionalWithholding, taxSettings.taxLines, taxableIncomeForEditor]);

    if (!budgetData) return null;

    const formatRateLabel = (line: TaxLine) => {
        if (getTaxLineCalculationType(line) === 'fixed') {
            return '-';
        }

        return `${line.rate.toFixed(2)}%`;
    };

    const formatTaxableIncomeLabel = (line: TaxLine) => {
        if (getTaxLineCalculationType(line) === 'fixed') {
            return '-';
        }

        return formatWithSymbol(
            convertToDisplayMode(getTaxableIncomeForTaxLine(breakdown.taxableIncome, line), paychecksPerYear, displayMode),
            currency,
            { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        );
    };

    const handleEditStart = () => {
        setEditLines(
            (taxSettings.taxLines || []).map(line => ({
                ...toEditableTaxLineValues(line, taxableIncomeForEditor),
            }))
        );
        setAdditionalWithholding(String(taxSettings.additionalWithholding ?? 0));
        setAdditionalWithholdingError(undefined);
        setShowEditModal(true);
    };

    const handleEditCancel = () => {
        setShowEditModal(false);
    };

    const handleLineChange = (id: string, field: 'label' | 'rate' | 'amount' | 'taxableIncome' | 'calculationType', value: string) => {
        setEditLines(prev => prev.map(line =>
            line.id === id ? syncEditableTaxLineValues(line, field, value, taxableIncomeForEditor) : line
        ));
    };

    const handleLineBlur = (id: string, field: 'rate' | 'amount' | 'taxableIncome') => {
        setEditLines((prev) => prev.map((line) => {
            if (line.id !== id) return line;

            if (field === 'taxableIncome') {
                const parsedTaxableIncome = Math.max(0, parseFloat(line.taxableIncome) || 0);
                return syncEditableTaxLineValues(line, 'taxableIncome', parsedTaxableIncome.toFixed(2), taxableIncomeForEditor);
            }

            if (field === 'amount') {
                const parsedAmount = Math.max(0, parseFloat(line.amount) || 0);
                return syncEditableTaxLineValues(line, 'amount', parsedAmount.toFixed(2), taxableIncomeForEditor);
            }

            const parsedRate = Math.max(0, parseFloat(line.rate) || 0);
            return syncEditableTaxLineValues(line, 'rate', parsedRate.toFixed(2), taxableIncomeForEditor);
        }));
    };

    const handleAddLine = () => {
        setEditLines(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                label: '',
                rate: '0',
                amount: '0.00',
                taxableIncome: taxableIncomeForEditor.toFixed(2),
                calculationType: 'percentage',
            },
        ]);
    };

    const handleRemoveLine = (id: string) => {
        setEditLines(prev => prev.filter(line => line.id !== id));
    };

    const handleEditSave = () => {
        let hasErrors = false;
        const validated = editLines.map(line => {
            const nextLine = validateEditableTaxLineValues(line);
            if (nextLine.error) {
                hasErrors = true;
            }
            return nextLine;
        });

        const parsedWithholding = parseFloat(additionalWithholding);
        if (!Number.isFinite(parsedWithholding) || parsedWithholding < 0) {
            setAdditionalWithholdingError('Additional withholding must be zero or greater.');
            hasErrors = true;
        } else {
            setAdditionalWithholdingError(undefined);
        }

        setEditLines(validated);
        if (hasErrors) return;

        const newTaxLines: TaxLine[] = validated.map(line => toStoredTaxLine(line, taxableIncomeForEditor));

        updateBudgetData({
            taxSettings: {
                taxLines: newTaxLines,
                additionalWithholding: parsedWithholding,
            },
        });
        setShowEditModal(false);
    };

    return (
        <div className="tab-view tax-breakdown">
            <PageHeader
                title="Tax Breakdown"
                subtitle="View and manage your tax withholding information"
                actions={
                    <>
                        <Button variant="primary" onClick={handleEditStart}>
                            Edit Tax Settings
                        </Button>
                    </>
                }
            />
            <div className="tax-summary">
                <div className="summary-section">
                    <h3>{getDisplayModeLabel(displayMode)} <GlossaryTerm termId="withholding">Taxes</GlossaryTerm></h3>
                    <div className="summary-table">
                        <div className="summary-row summary-header-row">
                            <span className="label">Tax Line</span>
                            <span className="rate">Rate (%)</span>
                            <span className="rate">Taxable Income</span>
                            <span className="amount">Amount</span>
                        </div>
                        {breakdown.taxLineAmounts.map(line => {
                            const storedLine = taxSettings.taxLines.find(l => l.id === line.id) || { id: line.id, label: line.label, rate: 0 };

                            return (
                                <div key={line.id} id={`tax-line-${line.id}`} className="summary-row">
                                    <span className="label">{line.label}</span>
                                    <span className="rate">{formatRateLabel(storedLine)}</span>
                                    <span className="rate">{formatTaxableIncomeLabel(storedLine)}</span>
                                    <span className="amount">{formatWithSymbol(convertToDisplayMode(line.amount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            );
                        })}
                        {breakdown.additionalWithholding > 0 && (
                            <div id="tax-additional-withholding-row" className="summary-row">
                                <span className="label"><GlossaryTerm termId="withholding">Additional Withholding</GlossaryTerm></span>
                                <span className="rate">-</span>
                                <span className="rate">-</span>
                                <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.additionalWithholding, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div id="tax-total-taxes-row" className="summary-row total">
                            <span className="label">Total Taxes</span>
                            <span className="rate">-</span>
                            <span className="rate">-</span>
                            <span className="amount">{formatWithSymbol(convertToDisplayMode(breakdown.totalTaxes, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* <div className="summary-section">
                    <div className="settings-header">
                        <h3>Tax Rates & Settings</h3>
                    </div>
                    <div className="settings-table">
                        {taxSettings.taxLines.map(line => (
                            <div key={line.id} className="settings-row">
                                <span className="label">{line.label}</span>
                                <span className="value">{getTaxLineSettingLabel(line)}</span>
                            </div>
                        ))}
                        <div className="settings-row">
                            <span className="label">Additional Withholding per Paycheck</span>
                            <span className="value">{formatWithSymbol(taxSettings.additionalWithholding, currency, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div> */}
            </div>

            {/* Edit Tax Settings Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={handleEditCancel}
                contentClassName="tax-settings-modal"
                header="Edit Tax Settings"
                footer={
                    <>
                        <Button variant="secondary" onClick={handleEditCancel}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleEditSave}>
                            Save
                        </Button>
                    </>
                }
            >
                <TaxLinesEditor
                    lines={editLines}
                    currency={currency}
                    onLineChange={handleLineChange}
                    onLineBlur={handleLineBlur}
                    onAddLine={handleAddLine}
                    onRemoveLine={handleRemoveLine}
                    introContent={
                        <div>
                            <p>Here you can modify the name, rate, taxable income, amount, and calculation mode for each line.</p>
                            <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: '1rem' }}>
                                <InfoBox>
                                    If you select <b>Rate</b> as the calculation mode, the amount will be automatically calculated based on the <b>taxable income and rate</b>.
                                </InfoBox>
                                <InfoBox>
                                    If you select <b>Fixed</b> as the calculation mode, you can directly enter the amount, and the rate will be calculated accordingly.
                                </InfoBox>
                            </div>
                        </div>
                    }
                />

                <div className="tax-lines-divider" />

                <FormGroup label={<><GlossaryTerm termId="withholding">Additional Withholding per Paycheck</GlossaryTerm></>} error={additionalWithholdingError}>
                    <InputWithPrefix
                        className={additionalWithholdingError ? 'field-error' : ''}
                        prefix={getCurrencySymbol(currency)}
                        type="number"
                        min="0"
                        step="0.01"
                        value={additionalWithholding}
                        onChange={e => {
                            setAdditionalWithholding(e.target.value);
                            if (additionalWithholdingError) setAdditionalWithholdingError(undefined);
                        }}
                    />
                </FormGroup>
            </Modal>
        </div>
    );
};

export default TaxBreakdown;
