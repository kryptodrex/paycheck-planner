import React from 'react';
import './StickyActions.css';

interface StickyActionsProps {
  children: React.ReactNode;
  className?: string;
}

const StickyActions: React.FC<StickyActionsProps> = ({ children, className }) => {
  return <div className={`sticky-actions ${className || ''}`.trim()}>{children}</div>;
};

export default StickyActions;
