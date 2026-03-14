import React from 'react';
import './SectionItemCard.css';

interface SectionItemCardProps {
  children: React.ReactNode;
  className?: string;
}

const SectionItemCard: React.FC<SectionItemCardProps> = ({ children, className }) => {
  return <div className={`section-item-card ${className || ''}`.trim()}>{children}</div>;
};

export default SectionItemCard;
