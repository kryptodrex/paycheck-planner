import React from 'react';
import Button from '../../controls/Button';
import './SectionItemCard.css';

interface SectionItemCardProps {
  /** Primary item name */
  title: React.ReactNode;
  /** Subtitle text, e.g. "Paid monthly: $100.00" */
  subtitle?: React.ReactNode;
  /** Formatted amount for the right-side display, e.g. "$1,200.00" */
  amount?: string;
  /** Small label below the amount, e.g. "Monthly" */
  amountLabel?: string;
  /** Badges (PillBadge nodes) shown below the subtitle */
  badges?: React.ReactNode;
  /** When true, card is dimmed and shows a PAUSED stamp overlay */
  isPaused?: boolean;
  /** If provided, renders a Pause / Resume button */
  onPauseToggle?: () => void;
  /** Overrides the auto-derived Pause / Resume label */
  pauseLabel?: string;
  /** Edit callback */
  onEdit: () => void;
  /** Delete callback */
  onDelete: () => void;
  /** Extra content rendered in the card body (notes, breakdown rows, etc.) */
  children?: React.ReactNode;
  className?: string;
}

const SectionItemCard: React.FC<SectionItemCardProps> = ({
  title,
  subtitle,
  amount,
  amountLabel,
  badges,
  isPaused = false,
  onPauseToggle,
  pauseLabel,
  onEdit,
  onDelete,
  children,
  className,
}) => {
  const pauseButtonLabel = pauseLabel ?? (isPaused ? 'Resume' : 'Pause');

  return (
    <div
      className={['section-item-card', isPaused ? 'item-is-paused' : '', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      {isPaused && (
        <div className="item-card-paused-stamp" aria-hidden="true">
          <span>PAUSED</span>
        </div>
      )}

      <div className="item-card-header">
        <div className="item-card-title-group">
          <h4 className="item-card-title">{title}</h4>
          {subtitle && <div className="item-card-subtitle">{subtitle}</div>}
          {badges && <div className="item-card-badges">{badges}</div>}
        </div>

        {(amount || amountLabel) && (
          <div className="item-card-amount-group">
            {amount && <span className="item-card-amount">{amount}</span>}
            {amountLabel && <span className="item-card-amount-label">{amountLabel}</span>}
          </div>
        )}
      </div>

      {children && <div className="item-card-body">{children}</div>}

      <div className="item-card-actions">
        {onPauseToggle && (
          <Button
            variant="utility"
            className={isPaused ? 'item-card-btn-resume' : 'item-card-btn-pause'}
            onClick={onPauseToggle}
          >
            {pauseButtonLabel}
          </Button>
        )}
        <Button variant="utility" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="utility" className="item-card-btn-delete" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
};

export default SectionItemCard;
