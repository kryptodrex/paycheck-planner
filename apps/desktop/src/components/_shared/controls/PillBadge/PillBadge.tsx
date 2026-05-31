import React from 'react';
import './PillBadge.css';

export type PillBadgeVariant = 'success' | 'accent' | 'info' | 'warning' | 'neutral' | 'outline';

interface PillBadgeProps {
  variant?: PillBadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const PillBadge: React.FC<PillBadgeProps> = ({
  variant = 'neutral',
  className,
  children,
}) => {
  const classes = [
    'pill-badge',
    `pill-badge--${variant}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={classes}>{children}</span>;
};

export default PillBadge;
