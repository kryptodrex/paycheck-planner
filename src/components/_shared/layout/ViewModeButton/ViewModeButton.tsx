import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { SelectableViewMode, ViewMode } from '../../../../types/viewMode';
import { SELECTABLE_VIEW_MODES } from '../../../../utils/viewModePreferences';
import { getDisplayModeLabel } from '../../../../utils/payPeriod';
import './ViewModeButton.css';

export interface ViewModeButtonOption<T extends string = string> {
  value: T;
  label: string;
}

export interface ViewModeButtonProps<T extends string = SelectableViewMode> {
  mode: T | ViewMode;
  selectedMode?: T | ViewMode;
  onChange: (mode: T) => void;
  onPreviewChange?: (mode: T | null) => void;
  options?: ViewModeButtonOption<T>[];
  highlightedValue?: T;
  highlightedLabel?: string;
  label?: string;
  preferredPlacement?: 'up' | 'down';
  disabled?: boolean;
}

const defaultOptions: ViewModeButtonOption<SelectableViewMode>[] = SELECTABLE_VIEW_MODES.map((mode) => ({
  value: mode,
  label: getDisplayModeLabel(mode),
}));

const ViewModeButton = <T extends string = SelectableViewMode,>({
  mode,
  selectedMode,
  onChange,
  onPreviewChange,
  options,
  highlightedValue,
  highlightedLabel = 'Pay frequency',
  label = 'Amounts',
  preferredPlacement = 'down',
  disabled = false,
}: ViewModeButtonProps<T>) => {
  const [expanded, setExpanded] = useState(false);
  const [placement, setPlacement] = useState<'up' | 'down'>(preferredPlacement);
  const [lockedWidth, setLockedWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const resolvedOptions = useMemo(
    () => ((options ?? defaultOptions) as ViewModeButtonOption<T>[]),
    [options],
  );

  const fallbackValue = resolvedOptions[0]?.value;
  const activeMode = ((mode === 'paycheck' ? highlightedValue ?? fallbackValue : (mode as T)) ?? fallbackValue);
  const committedMode = ((selectedMode ?? mode) === 'paycheck'
    ? highlightedValue ?? fallbackValue
    : ((selectedMode ?? mode) as T)) ?? fallbackValue;

  const activeOption = resolvedOptions.find((option) => option.value === activeMode) ?? resolvedOptions[0];

  const clearPreview = useCallback(() => {
    onPreviewChange?.(null);
  }, [onPreviewChange]);

  const closePanel = useCallback(() => {
    setExpanded(false);
    clearPreview();
  }, [clearPreview]);

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closePanel, expanded]);

  useLayoutEffect(() => {
    const measure = () => {
      const measureRoot = measureRef.current;
      if (!measureRoot) {
        return;
      }

      const triggerWidths = Array.from(measureRoot.querySelectorAll<HTMLElement>('[data-measure-trigger]'));
      const optionWidths = Array.from(measureRoot.querySelectorAll<HTMLElement>('[data-measure-option]'));
      const widestTrigger = triggerWidths.reduce((max, element) => Math.max(max, element.offsetWidth), 0);
      const widestOption = optionWidths.reduce((max, element) => Math.max(max, element.offsetWidth), 0);
      const nextWidth = Math.ceil(Math.max(widestTrigger, widestOption));

      if (nextWidth > 0) {
        setLockedWidth(nextWidth);
      }
    };

    measure();
    window.addEventListener('resize', measure);

    return () => {
      window.removeEventListener('resize', measure);
    };
  }, [expanded, highlightedLabel, highlightedValue, label, resolvedOptions]);

  useLayoutEffect(() => {
    if (!expanded) {
      return;
    }

    const updatePlacement = () => {
      const container = containerRef.current;
      const panel = panelRef.current;
      if (!container || !panel) {
        return;
      }

      const gap = 8;
      const rect = container.getBoundingClientRect();
      const panelHeight = panel.scrollHeight;
      const spaceAbove = rect.top - gap;
      const spaceBelow = window.innerHeight - rect.bottom - gap;

      if (preferredPlacement === 'up') {
        setPlacement(spaceAbove >= panelHeight || spaceAbove > spaceBelow ? 'up' : 'down');
        return;
      }

      setPlacement(spaceBelow >= panelHeight || spaceBelow >= spaceAbove ? 'down' : 'up');
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);

    return () => {
      window.removeEventListener('resize', updatePlacement);
    };
  }, [expanded, preferredPlacement]);

  const handlePreview = useCallback((nextMode: T) => {
    if (disabled) return;
    onPreviewChange?.(nextMode);
  }, [disabled, onPreviewChange]);

  const handleCommit = useCallback((nextMode: T) => {
    if (disabled) return;
    onChange(nextMode);
    closePanel();
  }, [closePanel, disabled, onChange]);

  const showHighlightedDot = activeMode === highlightedValue;

  return (
    <div
      ref={containerRef}
      className={`view-mode-button${expanded ? ' view-mode-button--open' : ''}`}
      style={lockedWidth ? { width: `${lockedWidth}px` } : undefined}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
          closePanel();
        }
      }}
    >
      <button
        type="button"
        className="view-mode-button__trigger"
        onClick={() => {
          if (disabled) return;
          setExpanded((current) => {
            if (current) {
              clearPreview();
            }
            return !current;
          });
        }}
        aria-haspopup="menu"
        aria-expanded={expanded}
        aria-label={`${label}: ${activeOption?.label ?? ''}`}
        disabled={disabled}
      >
        <span className="view-mode-button__trigger-copy">
          <span className="view-mode-button__label">{label}</span>
          <span className="view-mode-button__value">
            {activeOption?.label}
            {showHighlightedDot && <span className="view-mode-button__dot" aria-hidden="true" />}
          </span>
        </span>
        <span
          className={`view-mode-button__caret${expanded ? ' view-mode-button__caret--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        ref={panelRef}
        className="view-mode-button__panel"
        data-placement={placement}
        role="menu"
        aria-label="Select amount display mode"
        onMouseLeave={clearPreview}
      >
        <div className="view-mode-button__hint">Hover to preview. Click to keep.</div>
        <div className="view-mode-button__options">
          {resolvedOptions.map((option) => {
            const isActive = option.value === activeMode;
            const isCommitted = option.value === committedMode;
            const isHighlighted = option.value === highlightedValue;

            return (
              <button
                key={option.value}
                type="button"
                className={`view-mode-button__option${isActive ? ' view-mode-button__option--active' : ''}${isCommitted ? ' view-mode-button__option--selected' : ''}`}
                onMouseEnter={() => handlePreview(option.value)}
                onFocus={() => handlePreview(option.value)}
                onClick={() => handleCommit(option.value)}
                role="menuitemradio"
                aria-checked={isCommitted}
              >
                <span className="view-mode-button__option-main">
                  <span className="view-mode-button__option-label">{option.label}</span>
                  {isHighlighted && (
                    <span className="view-mode-button__option-badge">
                      <span className="view-mode-button__dot" aria-hidden="true" />
                      {highlightedLabel}
                    </span>
                  )}
                </span>
                {isCommitted && <Check className="ui-icon ui-icon-sm view-mode-button__check" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={measureRef} className="view-mode-button__measure" aria-hidden="true">
        {resolvedOptions.map((option) => {
          const isHighlighted = option.value === highlightedValue;

          return (
            <React.Fragment key={option.value}>
              <button type="button" className="view-mode-button__trigger" data-measure-trigger tabIndex={-1}>
                <span className="view-mode-button__trigger-copy">
                  <span className="view-mode-button__label">{label}</span>
                  <span className="view-mode-button__value">
                    {option.label}
                    {isHighlighted && <span className="view-mode-button__dot" aria-hidden="true" />}
                  </span>
                </span>
                <span className="view-mode-button__caret" aria-hidden="true" />
              </button>

              <div className="view-mode-button__option view-mode-button__option--selected" data-measure-option>
                <span className="view-mode-button__option-main">
                  <span className="view-mode-button__option-label">{option.label}</span>
                  {isHighlighted && (
                    <span className="view-mode-button__option-badge">
                      <span className="view-mode-button__dot" aria-hidden="true" />
                      {highlightedLabel}
                    </span>
                  )}
                </span>
                <Check className="ui-icon ui-icon-sm view-mode-button__check" aria-hidden="true" />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ViewModeButton;