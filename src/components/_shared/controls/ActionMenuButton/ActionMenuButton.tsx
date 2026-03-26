import React, { useEffect, useRef, useState } from 'react';
import Button from '../Button';
import './ActionMenuButton.css';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

interface ActionMenuButtonProps {
  label: string;
  items: ActionMenuItem[];
  variant?: 'primary' | 'secondary' | 'tertiary';
  leadingIcon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
}

const ActionMenuButton: React.FC<ActionMenuButtonProps> = ({
  label,
  items,
  variant = 'primary',
  leadingIcon,
  disabled = false,
  className,
  triggerClassName,
  menuClassName,
  optionClassName,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`action-menu-button ${className || ''}`.trim()}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node)) {
          closeMenu();
        }
      }}
    >
      <Button
        variant={variant}
        className={`action-menu-button__trigger ${triggerClassName || ''}`.trim()}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
      >
        {leadingIcon}
        {label}
        <span className={`action-menu-button__caret${open ? ' action-menu-button__caret--open' : ''}`} aria-hidden="true" />
      </Button>

      {open && (
        <div className={`action-menu-button__menu ${menuClassName || ''}`.trim()} role="menu" aria-label={label}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`action-menu-button__option ${optionClassName || ''}`.trim()}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                closeMenu();
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionMenuButton;