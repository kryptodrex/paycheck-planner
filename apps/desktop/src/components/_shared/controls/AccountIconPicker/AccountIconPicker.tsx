import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ACCOUNT_ICON_MAP, ACCOUNT_ICON_NAMES } from '../../../../utils/iconNameToComponent';
import type { AccountIconName } from '../../../../utils/iconNameToComponent';
import './AccountIconPicker.css';

interface AccountIconPickerProps {
  /** Currently selected icon name */
  value: string;
  /** Callback when an icon is selected */
  onChange: (iconName: string) => void;
  /** Optional CSS class name */
  className?: string;
}

const AccountIconPicker: React.FC<AccountIconPickerProps> = ({ value, onChange, className = '' }) => {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('down');
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const formatIconLabel = useCallback((iconName: string): string => iconName.replace(/([a-z])([A-Z])/g, '$1 $2'), []);

  const selectedIconName = useMemo<AccountIconName>(() => {
    return value in ACCOUNT_ICON_MAP
      ? (value as AccountIconName)
      : ACCOUNT_ICON_NAMES[0];
  }, [value]);

  const SelectedIconComponent = ACCOUNT_ICON_MAP[selectedIconName];
  const selectedLabel = formatIconLabel(selectedIconName);

  const updatePopoverPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const popoverEl = popoverRef.current;
    if (!triggerEl || !popoverEl) {
      return;
    }

    const viewportPadding = 8;
    const gap = 6;
    const triggerRect = triggerEl.getBoundingClientRect();
    const popoverWidth = popoverEl.offsetWidth;
    const popoverHeight = popoverEl.offsetHeight;

    const availableBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const availableAbove = triggerRect.top - viewportPadding;
    const preferUpward = availableBelow < Math.min(popoverHeight, 300) && availableAbove > availableBelow;
    const maxHeight = Math.max(180, (preferUpward ? availableAbove : availableBelow) - gap);
    const renderedHeight = Math.min(popoverHeight, maxHeight);

    const top = preferUpward
      ? Math.max(viewportPadding, triggerRect.top - renderedHeight - gap)
      : Math.min(window.innerHeight - renderedHeight - viewportPadding, triggerRect.bottom + gap);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - popoverWidth - viewportPadding,
    );

    setOpenDirection(preferUpward ? 'up' : 'down');
    setPopoverStyle({
      top: Math.round(top),
      left: Math.round(left),
      maxHeight: Math.floor(maxHeight),
    });
    setIsPositioned(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const clickedInsideTrigger = pickerRef.current?.contains(targetNode);
      const clickedInsidePopover = popoverRef.current?.contains(targetNode);

      if (!clickedInsideTrigger && !clickedInsidePopover) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const rafId = window.requestAnimationFrame(updatePopoverPosition);

    const handleViewportChange = () => {
      updatePopoverPosition();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, updatePopoverPosition]);

  const popover = isOpen ? createPortal(
    <div
      ref={popoverRef}
      className={`icon-picker-popover icon-picker-popover-${openDirection}`}
      style={{
        ...popoverStyle,
        visibility: isPositioned ? 'visible' : 'hidden',
      }}
      role="listbox"
      aria-label="Account icons"
    >
      <div className="icon-picker-grid">
        {ACCOUNT_ICON_NAMES.map((iconName) => {
          const IconComponent = ACCOUNT_ICON_MAP[iconName];
          const isSelected = selectedIconName === iconName;
          const displayLabel = formatIconLabel(iconName);

          return (
            <button
              key={iconName}
              type="button"
              role="option"
              className={`icon-picker-button ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                onChange(iconName);
                setIsOpen(false);
              }}
              title={`Select ${displayLabel} icon`}
              aria-label={`${displayLabel} icon`}
              aria-selected={isSelected}
            >
              <IconComponent className="picker-icon" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={pickerRef} className={`account-icon-picker ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className={`icon-picker-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next) {
              setIsPositioned(false);
            }
            return next;
          });
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Account icon: ${selectedLabel}`}
      >
        <span className="icon-picker-trigger-value">
          <SelectedIconComponent className="icon-picker-trigger-icon" aria-hidden="true" />
        </span>
      </button>

      {popover}
    </div>
  );
};

export default AccountIconPicker;
