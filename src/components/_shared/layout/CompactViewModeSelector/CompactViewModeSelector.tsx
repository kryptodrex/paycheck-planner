import { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { SelectableViewMode, ViewMode } from '../../../../types/viewMode';
import { SELECTABLE_VIEW_MODES } from '../../../../utils/viewModePreferences';
import { getDisplayModeLabel } from '../../../../utils/payPeriod';
import './CompactViewModeSelector.css';

export type CompactViewModeVariant = 'spinner' | 'floating-row' | 'grid-popover' | 'fan';

export interface CompactSelectorOption<T extends string = string> {
    value: T;
    label: string;
}

export interface CompactViewModeSelectorProps<T extends string = SelectableViewMode> {
    /** Currently active view mode. */
    mode: T | ViewMode;
    onChange: (mode: T) => void;
    options?: CompactSelectorOption<T>[];
    /** Optional highlighted option shown with a small badge in the selector/panel. */
    highlightedValue?: T;
    highlightedLabel?: string;
    disabled?: boolean;
    hidden?: boolean;
    /**
     * Controls the visual/interaction style:
     * - `spinner`       — Active label with ← → arrows, no expand.
     * - `floating-row`  — Compact chip; hovers to reveal a floating row of all 6 options.
     * - `grid-popover`  — Compact chip; hovers to reveal a floating 2×3 grid card.
     * - `fan`           — Minimal single label; hovers to reveal a floating strip with a staggered entrance.
     */
    variant?: CompactViewModeVariant;
}

const defaultOptions: CompactSelectorOption<SelectableViewMode>[] = SELECTABLE_VIEW_MODES.map((mode) => ({
    value: mode,
    label: getDisplayModeLabel(mode),
}));

const CompactViewModeSelector = <T extends string = SelectableViewMode,>({
    mode,
    onChange,
    options,
    highlightedValue,
    highlightedLabel = 'Highlighted',
    disabled = false,
    hidden = false,
    variant = 'floating-row',
}: CompactViewModeSelectorProps<T>) => {
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const closeTimeoutRef = useRef<number | null>(null);

    const clearCloseTimeout = useCallback(() => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    }, []);

    const openPanel = useCallback(() => {
        if (disabled || hidden || variant === 'spinner') return;
        clearCloseTimeout();
        setExpanded(true);
    }, [clearCloseTimeout, disabled, hidden, variant]);

    const scheduleClosePanel = useCallback((delay = 140) => {
        clearCloseTimeout();
        closeTimeoutRef.current = window.setTimeout(() => {
            setExpanded(false);
            closeTimeoutRef.current = null;
        }, delay);
    }, [clearCloseTimeout]);

    const resolvedOptions = (options ?? defaultOptions) as CompactSelectorOption<T>[];
    const fallbackValue = resolvedOptions[0]?.value;
    const activeMode = (mode === 'paycheck' ? highlightedValue ?? fallbackValue : (mode as T)) ?? fallbackValue;
    const currentIndex = Math.max(
        0,
        resolvedOptions.findIndex((option) => option.value === activeMode),
    );
    const currentOption = resolvedOptions[currentIndex] ?? resolvedOptions[0];
    const currentLabel = currentOption?.label ?? '';
    const isHighlighted = activeMode === highlightedValue;

    const cycleMode = useCallback(
        (direction: 1 | -1) => {
            if (disabled) return;
            const next =
                (currentIndex + direction + resolvedOptions.length) %
                resolvedOptions.length;
            const nextOption = resolvedOptions[next];
            if (nextOption) {
                onChange(nextOption.value);
            }
        },
        [currentIndex, disabled, onChange, resolvedOptions],
    );

    const handleSelect = useCallback(
        (selected: T) => {
            onChange(selected);
            setExpanded(false);
        },
        [onChange],
    );

    // Close on outside click
    useEffect(() => {
        if (!expanded) return;
        const handleDown = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleDown);
        return () => document.removeEventListener('mousedown', handleDown);
    }, [expanded]);

    useEffect(() => {
        return () => {
            clearCloseTimeout();
        };
    }, [clearCloseTimeout]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (disabled) return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                cycleMode(-1);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                cycleMode(1);
            } else if (e.key === 'Escape') {
                setExpanded(false);
            }
        },
        [disabled, cycleMode],
    );

    // ── Variant A: Spinner ────────────────────────────────────────────────────
    if (variant === 'spinner') {
        const prevIndex = (currentIndex - 1 + resolvedOptions.length) % resolvedOptions.length;
        const nextIndex = (currentIndex + 1) % resolvedOptions.length;
        return (
            <div
                ref={containerRef}
                className="cvms cvms--spinner"
                onKeyDown={handleKeyDown}
                aria-label={`View mode: ${currentLabel}`}
                style={{ display: hidden ? 'none' : undefined }}
            >
                <button
                    className="cvms__arrow"
                    onClick={() => cycleMode(-1)}
                    disabled={disabled}
                    aria-label={`Previous: ${resolvedOptions[prevIndex]?.label ?? ''}`}
                    title={`Previous: ${resolvedOptions[prevIndex]?.label ?? ''}`}
                >
                    <ChevronLeft className="ui-icon ui-icon-sm" aria-hidden="true" />
                </button>
                <span className="cvms__spinner-label" role="status" aria-live="polite">
                    {currentLabel}
                    {isHighlighted && highlightedLabel && (
                        <span className="cvms__badge">{highlightedLabel}</span>
                    )}
                </span>
                <button
                    className="cvms__arrow"
                    onClick={() => cycleMode(1)}
                    disabled={disabled}
                    aria-label={`Next: ${resolvedOptions[nextIndex]?.label ?? ''}`}
                    title={`Next: ${resolvedOptions[nextIndex]?.label ?? ''}`}
                >
                    <ChevronRight className="ui-icon ui-icon-sm" aria-hidden="true" />
                </button>
            </div>
        );
    }

    // ── Variants B, C, D: Chip + Floating Panel ───────────────────────────────
    const isFan = variant === 'fan';
    const showArrows = variant === 'floating-row' || variant === 'grid-popover';
    const panelLayout = variant === 'grid-popover' ? 'grid' : 'row';

    return (
        <div
            style={{ display: hidden ? 'none' : undefined }}
            ref={containerRef}
            className={`cvms cvms--${variant}${expanded ? ' cvms--open' : ''}`}
            onMouseEnter={openPanel}
            onMouseLeave={() => scheduleClosePanel()}
            onFocus={openPanel}
            onBlur={(e) => {
                if (!containerRef.current?.contains(e.relatedTarget as Node)) {
                    scheduleClosePanel(0);
                }
            }}
            onKeyDown={handleKeyDown}
        >
            {/* ── Chip / trigger ── */}
            <div className="cvms__chip">
                {showArrows && (
                    <button
                        className="cvms__arrow"
                        onClick={(e) => {
                            e.stopPropagation();
                            cycleMode(-1);
                        }}
                        disabled={disabled}
                        aria-label="Previous view mode"
                        tabIndex={-1}
                    >
                        <ChevronLeft className="ui-icon ui-icon-sm" aria-hidden="true" />
                    </button>
                )}

                <button
                    className="cvms__trigger"
                    onClick={() => {
                        if (disabled) return;
                        clearCloseTimeout();
                        setExpanded((v) => !v);
                    }}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={expanded}
                    aria-label={`View mode: ${currentLabel}`}
                >
                    <span className="cvms__trigger-label">{currentLabel}</span>
                    {isHighlighted && highlightedLabel && (
                        <span className="cvms__badge cvms__badge--trigger">{highlightedLabel}</span>
                    )}
                    {!isFan && (
                        <ChevronDown
                            className={`ui-icon ui-icon-sm cvms__chevron${expanded ? ' cvms__chevron--open' : ''}`}
                            aria-hidden="true"
                        />
                    )}
                </button>

                {showArrows && (
                    <button
                        className="cvms__arrow"
                        onClick={(e) => {
                            e.stopPropagation();
                            cycleMode(1);
                        }}
                        disabled={disabled}
                        aria-label="Next view mode"
                        tabIndex={-1}
                    >
                        <ChevronRight className="ui-icon ui-icon-sm" aria-hidden="true" />
                    </button>
                )}
            </div>

            {/* ── Floating panel ── */}
            <div
                className={`cvms__panel cvms__panel--${panelLayout}`}
                role="listbox"
                aria-label="Select view mode"
                aria-hidden={!expanded}
                onMouseEnter={clearCloseTimeout}
                onMouseLeave={() => scheduleClosePanel()}
            >
                {resolvedOptions.map((option) => (
                    <button
                        key={option.value}
                        className={`cvms__option${option.value === activeMode ? ' cvms__option--active' : ''}`}
                        onClick={() => handleSelect(option.value)}
                        disabled={disabled}
                        role="option"
                        aria-selected={option.value === activeMode}
                        tabIndex={expanded ? 0 : -1}
                    >
                        <span>{option.label}</span>
                        {highlightedValue === option.value && highlightedLabel && (
                            <span className="cvms__badge">{highlightedLabel}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CompactViewModeSelector;
