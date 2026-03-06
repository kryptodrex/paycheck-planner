import React, { useState, useEffect, useRef } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { Benefit, RetirementElection } from '../../types/auth';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { Modal, Button, FormGroup, InputWithPrefix, RadioGroup, SectionItemCard } from '../shared';
import './BenefitsManager.css';

interface BenefitsManagerProps {
  shouldScrollToRetirement?: boolean;
  onScrollToRetirementComplete?: () => void;
}

const BenefitsManager: React.FC<BenefitsManagerProps> = ({ shouldScrollToRetirement, onScrollToRetirementComplete }) => {
  const { budgetData, addBenefit, updateBenefit, deleteBenefit, addRetirementElection, updateRetirementElection, deleteRetirementElection, calculateRetirementContributions } = useBudget();
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
  const [retirementType, setRetirementType] = useState<'401k' | '403b' | 'roth-ira' | 'traditional-ira' | 'other'>('401k');
  const [employeeAmount, setEmployeeAmount] = useState('');
  const [employeeIsPercentage, setEmployeeIsPercentage] = useState(false);
  const [retirementSource, setRetirementSource] = useState<'paycheck' | 'account'>('paycheck');
  const [retirementSourceAccountId, setRetirementSourceAccountId] = useState('');
  const [retirementIsPreTax, setRetirementIsPreTax] = useState(true);
  const [employerMatchOption, setEmployerMatchOption] = useState<'no-match' | 'has-match'>('no-match');
  const [employerMatchCap, setEmployerMatchCap] = useState('');
  const [employerMatchCapIsPercentage, setEmployerMatchCapIsPercentage] = useState(false);

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';

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

  // Benefit handlers
  const handleAddBenefit = () => {
    setEditingBenefit(null);
    setBenefitName('');
    setBenefitAmount('');
    setBenefitIsPercentage(false);
    setBenefitIsTaxable(false);
    setBenefitSource('paycheck');
    setBenefitSourceAccountId('');
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
    setShowAddBenefit(true);
  };

  const handleSaveBenefit = () => {
    const isAccountSource = benefitSource === 'account';
    const benefitData = {
      name: benefitName,
      amount: parseFloat(benefitAmount),
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
  };

  const handleDeleteBenefit = (id: string) => {
    if (confirm('Are you sure you want to delete this benefit?')) {
      deleteBenefit(id);
    }
  };

  // Retirement handlers
  const handleAddRetirement = () => {
    setEditingRetirement(null);
    setRetirementType('401k');
    setEmployeeAmount('');
    setEmployeeIsPercentage(false);
    setRetirementSource('paycheck');
    setRetirementSourceAccountId('');
    setRetirementIsPreTax(true);
    setEmployerMatchOption('no-match');
    setEmployerMatchCap('');
    setEmployerMatchCapIsPercentage(false);
    setShowAddRetirement(true);
  };

  const handleEditRetirement = (election: RetirementElection) => {
    setEditingRetirement(election);
    setRetirementType(election.type);
    setEmployeeAmount(election.employeeContribution.toString());
    setEmployeeIsPercentage(election.employeeContributionIsPercentage);
    setRetirementSource(election.deductionSource || 'paycheck');
    setRetirementSourceAccountId(election.sourceAccountId || '');
    setRetirementIsPreTax(election.isPreTax !== false);
    setEmployerMatchOption(election.hasEmployerMatch ? 'has-match' : 'no-match');
    setEmployerMatchCap((election.employerMatchCap || 0).toString());
    setEmployerMatchCapIsPercentage(election.employerMatchCapIsPercentage);
    setShowAddRetirement(true);
  };

  const handleSaveRetirement = () => {
    const hasEmployerMatch = employerMatchOption === 'has-match';
    const parsedMatchCap = parseFloat(employerMatchCap);
    const isAccountSource = retirementSource === 'account';
    const retirementData = {
      type: retirementType,
      employeeContribution: parseFloat(employeeAmount),
      employeeContributionIsPercentage: employeeIsPercentage,
      isPreTax: isAccountSource ? false : retirementIsPreTax,
      deductionSource: retirementSource,
      sourceAccountId: isAccountSource ? retirementSourceAccountId : undefined,
      hasEmployerMatch: hasEmployerMatch,
      employerMatchCap: hasEmployerMatch ? (isNaN(parsedMatchCap) ? 0 : parsedMatchCap) : 0,
      employerMatchCapIsPercentage: hasEmployerMatch ? employerMatchCapIsPercentage : false,
    };

    if (editingRetirement) {
      updateRetirementElection(editingRetirement.id, retirementData);
    } else {
      addRetirementElection(retirementData);
    }

    setShowAddRetirement(false);
    setEditingRetirement(null);
  };

  const handleDeleteRetirement = (id: string) => {
    if (confirm('Are you sure you want to delete this retirement election?')) {
      deleteRetirementElection(id);
    }
  };

  return (
    <div className="benefits-manager">
      {/* Benefits Section */}
      <div className="benefits-section">
        <div className="section-header">
          <h2>Benefits Elections</h2>
          <p>Health insurance, FSA, HSA, and other benefit deductions</p>
          <Button variant="primary" onClick={handleAddBenefit}>
            + Add Benefit
          </Button>
        </div>

        {budgetData.benefits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏥</div>
            <h3>No Benefits Yet</h3>
            <p>Add your benefit elections to get started</p>
          </div>
        ) : (
          <div className="benefits-list">
            {budgetData.benefits.map(benefit => {
              const accountName = benefit.deductionSource === 'account' 
                ? budgetData.accounts.find(acc => acc.id === benefit.sourceAccountId)?.name 
                : null;
              
              return (
              <SectionItemCard key={benefit.id} className="benefit-item">
                <div className="benefit-info">
                  <h4>{benefit.name}</h4>
                  <span className={`benefit-type ${benefit.deductionSource === 'account' ? 'from-account' : (benefit.isTaxable ? 'post-tax' : 'pre-tax')}`}>
                    {benefit.deductionSource === 'account' ? `From ${accountName}` : (benefit.isTaxable ? 'Post-Tax' : 'Pre-Tax')}
                  </span>
                </div>
                <div className="benefit-amount">
                  <span className="amount">
                    {benefit.isPercentage ? `${benefit.amount}%` : formatWithSymbol(benefit.amount, currency, { minimumFractionDigits: 2 })}
                  </span>
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
      <div id="retirement-section" className="retirement-section">
        <div className="section-header">
          <h2>Retirement Elections</h2>
          <p>401k, 403b, IRA, and other retirement plan contributions</p>
          <Button variant="primary" onClick={handleAddRetirement}>
            + Add Retirement Plan
          </Button>
        </div>

        {budgetData.retirement.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏦</div>
            <h3>No Retirement Plans Yet</h3>
            <p>Add your retirement plan elections to get started</p>
          </div>
        ) : (
          <div className="retirement-list">
            {budgetData.retirement.map(retirement => {
              const { employeeAmount, employerAmount } = calculateRetirementContributions(retirement);
              
              return (
                <SectionItemCard key={retirement.id} className="retirement-item">
                  <div className="retirement-info">
                    <h4>{retirement.type.toUpperCase()}</h4>
                    <div className="retirement-details">
                      <div className="detail">
                        <span className="label">Employee Contribution:</span>
                        <span className="value">
                          {formatWithSymbol(employeeAmount || 0, currency, { minimumFractionDigits: 2 })} per paycheck
                          {retirement.employeeContributionIsPercentage && ` (${retirement.employeeContribution}%)`}
                        </span>
                      </div>
                      {retirement.hasEmployerMatch && (
                        <div className="detail">
                          <span className="label">Employer Match:</span>
                          <span className="value">
                            {formatWithSymbol(employerAmount || 0, currency, { minimumFractionDigits: 2 })} per paycheck
                            (up to {retirement.employerMatchCapIsPercentage ? `${retirement.employerMatchCap || 0}%` : formatWithSymbol(retirement.employerMatchCap || 0, currency, { minimumFractionDigits: 2 })})
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
        onClose={() => setShowAddBenefit(false)}
        header={editingBenefit ? 'Edit Benefit' : 'Add Benefit'}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setShowAddBenefit(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" onClick={handleSaveBenefit}>
              {editingBenefit ? 'Update Benefit' : 'Add Benefit'}
            </Button>
          </>
        }
      >
        <FormGroup label="Benefit Name" required>
            <input
              type="text"
              value={benefitName}
              onChange={e => setBenefitName(e.target.value)}
              placeholder="e.g., Health Insurance, FSA"
              required
            />
          </FormGroup>

          <FormGroup label="Deduction Source">
            <select
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
              }}
            >
              <option value="paycheck">Paid from Paycheck</option>
              {budgetData.accounts.map((account) => (
                <option key={account.id} value={account.id}>Paid from Account: {account.name}</option>
              ))}
            </select>
          </FormGroup>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <FormGroup label="Amount" required>
                <InputWithPrefix
                  prefix={benefitIsPercentage ? '%' : getCurrencySymbol(currency)}
                  type="number"
                  value={benefitAmount}
                  onChange={e => setBenefitAmount(e.target.value)}
                  placeholder={benefitIsPercentage ? '0' : '0.00'}
                  step={benefitIsPercentage ? '0.1' : '0.01'}
                  min="0"
                  required
                />
              </FormGroup>
            </div>
            <div style={{ flex: 1 }}>
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
        onClose={() => setShowAddRetirement(false)}
        header={editingRetirement ? 'Edit Retirement Plan' : 'Add Retirement Plan'}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setShowAddRetirement(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" onClick={handleSaveRetirement}>
              {editingRetirement ? 'Update Plan' : 'Add Plan'}
            </Button>
          </>
        }
      >
        <FormGroup label="Plan Type" required>
            <select value={retirementType} onChange={e => setRetirementType(e.target.value as any)} required>
              <option value="401k">401(k)</option>
              <option value="403b">403(b)</option>
              <option value="roth-ira">Roth IRA</option>
              <option value="traditional-ira">Traditional IRA</option>
              <option value="other">Other</option>
            </select>
          </FormGroup>

          <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h4 style={{ marginTop: 0 }}>Employee Contribution</h4>
            
            <FormGroup label="Deduction Source">
              <select
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
                }}
              >
                <option value="paycheck">Paid from Paycheck</option>
                {budgetData.accounts.map((account) => (
                  <option key={account.id} value={account.id}>Paid from Account: {account.name}</option>
                ))}
              </select>
            </FormGroup>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ flex: 1 }}>
                <FormGroup label="Amount" required>
                  <InputWithPrefix
                    prefix={employeeIsPercentage ? '%' : getCurrencySymbol(currency)}
                    type="number"
                    value={employeeAmount}
                    onChange={e => setEmployeeAmount(e.target.value)}
                    placeholder={employeeIsPercentage ? '0' : '0.00'}
                    step={employeeIsPercentage ? '0.1' : '0.01'}
                    min="0"
                    required
                  />
                </FormGroup>
              </div>
              <div style={{ flex: 1 }}>
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
                <FormGroup label="Tax Treatment">
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

            {retirementSource === 'account' && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                Account-based contributions are treated as post-tax and will be grouped under the selected account in Pay Breakdown.
              </p>
            )}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Employer Match (Optional)</h4>
            
            <FormGroup label="Employer Match Availability">
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
                    <FormGroup label="Match Cap" required>
                      <InputWithPrefix
                        prefix={employerMatchCapIsPercentage ? '%' : getCurrencySymbol(currency)}
                        type="number"
                        value={employerMatchCap}
                        onChange={e => setEmployerMatchCap(e.target.value)}
                        placeholder={employerMatchCapIsPercentage ? '6' : '0.00'}
                        step={employerMatchCapIsPercentage ? '0.1' : '0.01'}
                        min="0"
                        required
                      />
                    </FormGroup>
                  </div>
                  <div style={{ flex: 1 }}>
                    <FormGroup label="Cap Type">
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
    </div>
  );
};

export default BenefitsManager;
