import React from 'react';
import { Building2, CalendarClock, ChartPie, Globe, PiggyBank, ShieldCheck } from 'lucide-react';
import { Button, Modal } from '../../_shared';
import './AboutModal.css';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header="About Paycheck Planner"
      contentClassName="about-modal"
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="about-intro">
        <h3>Plan where every paycheck goes</h3>
        <p>Paycheck Planner helps you manage your finances with year-based planning, tracking exactly where your money goes from gross pay to net.</p>
      </div>

      <div className="about-features">
        <div className="about-feature">
          <span className="about-feature-icon" aria-hidden="true"><PiggyBank className="ui-icon" /></span>
          <div className="about-feature-content">
            <h4>Paycheck Breakdown</h4>
            <p>See exactly where your money goes from gross pay to take-home, including all deductions, taxes, and withholdings.</p>
          </div>
        </div>

        <div className="about-feature">
          <span className="about-feature-icon" aria-hidden="true"><ChartPie className="ui-icon" /></span>
          <div className="about-feature-content">
            <h4>Smart Allocations</h4>
            <p>Assign your net pay to accounts and track recurring bills. Plan how each paycheck will be distributed across your financial goals.</p>
          </div>
        </div>

        <div className="about-feature">
          <span className="about-feature-icon" aria-hidden="true"><ShieldCheck className="ui-icon" /></span>
          <div className="about-feature-content">
            <h4>Secure & Local</h4>
            <p>Your data stays on your computer with optional encryption. No cloud sync, no data sharing—complete privacy and control.</p>
          </div>
        </div>

        <div className="about-feature">
          <span className="about-feature-icon" aria-hidden="true"><Globe className="ui-icon" /></span>
          <div className="about-feature-content">
            <h4>Multi-Currency Support</h4>
            <p>Set currency per plan and display amounts in your preferred currency throughout your financial planning.</p>
          </div>
        </div>

        <div className="about-feature">
          <span className="about-feature-icon" aria-hidden="true"><Building2 className="ui-icon" /></span>
          <div className="about-feature-content">
            <h4>Account Management</h4>
            <p>Create and manage multiple accounts (checking, savings, investment) and associate them with your bills and allocations.</p>
          </div>
        </div>

        <div className="about-feature">
          <span className="about-feature-icon" aria-hidden="true"><CalendarClock className="ui-icon" /></span>
          <div className="about-feature-content">
            <h4>Year-Based Planning</h4>
            <p>Create separate plans for each year, making it easy to compare and track your financial progress over time.</p>
          </div>
        </div>
      </div>

      <div className="about-version">
        <p><strong>Version:</strong> 1.0.0</p>
      </div>
    </Modal>
  );
};

export default AboutModal;
