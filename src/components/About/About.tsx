import React from 'react';
import './About.css';

interface AboutProps {
  isOpen: boolean;
  onClose: () => void;
}

const About: React.FC<AboutProps> = ({ isOpen, onClose }) => {
  // Handle Esc key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="about-header">
          <h2>About Paycheck Planner</h2>
          <button className="about-close" onClick={onClose} aria-label="Close about">
            ✕
          </button>
        </div>

        <div className="about-content">
          <div className="about-intro">
            <h3>Plan where every paycheck goes</h3>
            <p>Paycheck Planner helps you manage your finances with year-based planning, tracking exactly where your money goes from gross pay to net.</p>
          </div>

          <div className="about-features">
            <div className="about-feature">
              <span className="about-feature-icon">💰</span>
              <div className="about-feature-content">
                <h4>Paycheck Breakdown</h4>
                <p>See exactly where your money goes from gross pay to take-home, including all deductions, taxes, and withholdings.</p>
              </div>
            </div>

            <div className="about-feature">
              <span className="about-feature-icon">📊</span>
              <div className="about-feature-content">
                <h4>Smart Allocations</h4>
                <p>Assign your net pay to accounts and track recurring bills. Plan how each paycheck will be distributed across your financial goals.</p>
              </div>
            </div>

            <div className="about-feature">
              <span className="about-feature-icon">🔒</span>
              <div className="about-feature-content">
                <h4>Secure & Local</h4>
                <p>Your data stays on your computer with optional encryption. No cloud sync, no data sharing—complete privacy and control.</p>
              </div>
            </div>

            <div className="about-feature">
              <span className="about-feature-icon">🌍</span>
              <div className="about-feature-content">
                <h4>Multi-Currency Support</h4>
                <p>Set currency per plan and display amounts in your preferred currency throughout your financial planning.</p>
              </div>
            </div>

            <div className="about-feature">
              <span className="about-feature-icon">🏦</span>
              <div className="about-feature-content">
                <h4>Account Management</h4>
                <p>Create and manage multiple accounts (checking, savings, investment) and associate them with your bills and allocations.</p>
              </div>
            </div>

            <div className="about-feature">
              <span className="about-feature-icon">📅</span>
              <div className="about-feature-content">
                <h4>Year-Based Planning</h4>
                <p>Create separate plans for each year, making it easy to compare and track your financial progress over time.</p>
              </div>
            </div>
          </div>

          <div className="about-version">
            <p><strong>Version:</strong> 1.0.0</p>
          </div>
        </div>

        <div className="about-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default About;
