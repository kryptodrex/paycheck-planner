import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { Benefit, RetirementElection } from '../../types/auth';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { Modal, Button, FormGroup, InputWithPrefix, RadioGroup } from '../shared';
import './BenefitsManager.css';

const BenefitsManager: React.FC = () => {
  const { budgetData, addBenefit, updateBenefit, deleteBenefit, addRetirementElection, updateRetirementElection, deleteRetirementElection, calculateRetirementContributions } = useBudget();
  const [showAddBenefit, setShowAddBenefit] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [showAddRetirement, setShowAddRetirement] = useState(false);
  const [editingRetirement, setEditingRetirement] = useState<RetirementElection | null>(null);

  // Benefit form state
  const [benefitName, setBenefitName] = useState('');
  const [benefitAmount, setBenefitAmount] = useState('');
  const [benefitIsPercentage, setBenefitIsPercentage] = useState(false);
  const [benefitIsTaxable, setBenefitIsTaxable] = useState(false);

  // Retirement form state
  const [retirementType, setRetirementType] = useState<'401k' | '403b' | 'roth-ira' | 'traditional-ira' | 'other'>('401k');
  const [employeeAmount, setEmployeeAmount] = useState('');
  const [employeeIsPercentage, setEmployeeIsPercentage] = useState(false);
  const [employerMatchOption, setEmployerMatchOption] = useState<'no-match' | 'has-match'>('no-match');
  const [employerMatchCap, setEmployerMatchCap] = useState('');
  const [employerMatchCapIsPercentage, setEmployerMatchCapIsPercentage] = useState(false);

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';

  // Benefit handlers
  const handleAddBenefit = () => {
    setEditingBenefit(null);
    setBenefitName('');
    setBenefitAmount('');
    setBenefitIsPercentage(false);
    setBenefitIsTaxable(false);
    setShowAddBenefit(true);
  };

  const handleEditBenefit = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setBenefitName(benefit.name);
    setBenefitAmount(benefit.amount.toString());
    setBenefitIsPercentage(benefit.isPercentage || false);
    setBenefitIsTaxable(benefit.isTaxable);
    setShowAddBenefit(true);
  };

  const handleSaveBenefit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const benefitData = {
      name: benefitName,
      amount: parseFloat(benefitAmount),
      isTaxable: benefitIsTaxable,
      isPercentage: benefitIsPercentage,
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
    setEmployerMatchOption(election.hasEmployerMatch ? 'has-match' : 'no-match');
    setEmployerMatchCap((election.employerMatchCap || 0).toString());
    setEmployerMatchCapIsPercentage(election.employerMatchCapIsPercentage);
    setShowAddRetirement(true);
  };

  const handleSaveRetirement = (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasEmployerMatch = employerMatchOption === 'has-match';
    const parsedMatchCap = parseFloat(employerMatchCap);
    const retirementData = {
      type: retirementType,
      employeeContribution: parseFloat(employeeAmount),
      employeeContributionIsPercentage: employeeIsPercentage,
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
            {budgetData.benefits.map(benefit => (
              <div key={benefit.id} className="benefit-item">
                <div className="benefit-info">
                  <h4>{benefit.name}</h4>
                  <span className={`benefit-type ${benefit.isTaxable ? 'post-tax' : 'pre-tax'}`}>
                    {benefit.isTaxable ? 'Post-Tax' : 'Pre-Tax'}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retirement Section */}
      <div className="retirement-section">
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
                <div key={retirement.id} className="retirement-item">
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Benefit Modal */}
      <Modal isOpen={showAddBenefit} onClose={() => setShowAddBenefit(false)}>
        <h3>{editingBenefit ? 'Edit Benefit' : 'Add Benefit'}</h3>
        <form onSubmit={handleSaveBenefit}>
          <FormGroup label="Benefit Name" required>
            <input
              type="text"
              value={benefitName}
              onChange={e => setBenefitName(e.target.value)}
              placeholder="e.g., Health Insurance, FSA"
              required
            />
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

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <Button type="button" variant="secondary" onClick={() => setShowAddBenefit(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingBenefit ? 'Update Benefit' : 'Add Benefit'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Retirement Modal */}
      <Modal isOpen={showAddRetirement} onClose={() => setShowAddRetirement(false)}>
        <h3>{editingRetirement ? 'Edit Retirement Plan' : 'Add Retirement Plan'}</h3>
        <form onSubmit={handleSaveRetirement}>
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
            <h4 style={{ marginTop: 0 }}>Employee Contribution (Pre-Tax)</h4>
            <div style={{ display: 'flex', gap: '1rem' }}>
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
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
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

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <Button type="button" variant="secondary" onClick={() => setShowAddRetirement(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingRetirement ? 'Update Plan' : 'Add Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BenefitsManager;
