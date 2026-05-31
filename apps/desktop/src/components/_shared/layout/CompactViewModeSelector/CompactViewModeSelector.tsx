import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { SelectableViewMode, ViewMode } from '../../../../types/viewMode';
import { SELECTABLE_VIEW_MODES } from '../../../../utils/viewModePreferences';
import { getDisplayModeLabel } from '../../../../utils/payPeriod';
import './CompactViewModeSelector.css';

export interface CompactSelectorOption<T extends string = string> {
    value: T;
    label: string;
}

export interface CompactViewModeSelectorProps<T extends string = SelectableViewMode> {
    /** Currently active view mode. */
    mode: T | ViewMode;
    onChange: (mode: T) => void;
    options?: CompactSelectorOption<T>[];
    /** Optional highlighted option shown with a subtle indicator in the selector/panel. */
    highlightedValue?: T;
    highlightedLabel?: string;
    disabled?: boolean;
    hidden?: boolean;
}

const defaultOptions: CompactSelectorOption<SelectableViewMode>[] = SELECTABLE_VIEW_MODES.map((mode) => ({
    value: mode,
    label: getDisplayModeLabel(mode),
}));

type CompactPanelLayout = 'row' | 'column';
type CompactPanelAlignment = 'center' | 'left' | 'right';

const CompactViewModeSelector = <T extends string = SelectableViewMode,>({
    mode,
    onChange,
    options,
    highlightedValue,
    highlightedLabel = 'Highlighted',
    disabled = false,
    hidden = false,
}: CompactViewModeSelectorProps<T>) => {
    const [expanded, setExpanded] = useState(false);
    const [panelLayout, setPanelLayout] = useState<CompactPanelLayout>('row');
    const [panelAlignment, setPanelAlignment] = useState<CompactPanelAlignment>('center');
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const closeTimeoutRef = useRef<number | null>(null);

    const clearCloseTimeout = useCallback(() => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    }, []);

    const openPanel = useCallback(() => {
        if (disabled || hidden) return;
        clearCloseTimeout();
        if (!expanded) {
            // Measure placement from a consistent baseline only when transitioning
            // from closed -> open, so hover/focus within the open panel does not snap.
            setPanelLayout('row');
            setPanelAlignment('center');
            setExpanded(true);
        }
    }, [clearCloseTimeout, disabled, hidden, expanded]);

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

    const triggerAriaLabel = isHighlighted && highlightedLabel
        ? `View mode: ${currentLabel}, ${highlightedLabel}`
        : `View mode: ${currentLabel}`;

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

    useLayoutEffect(() => {
        if (!expanded) {
            return;
        }

        const updatePanelPlacement = () => {
            const container = containerRef.current;
            const panel = panelRef.current;
            if (!container || !panel) {
                return;
            }

            const viewportPadding = 8;
            const viewportWidth = window.innerWidth;
            const containerRect = container.getBoundingClientRect();
            const rowWidth = Math.max(panel.scrollWidth, panel.getBoundingClientRect().width);

            const centeredLeft = containerRect.left + (containerRect.width / 2) - (rowWidth / 2);
            const centeredRight = centeredLeft + rowWidth;
            if (centeredLeft >= viewportPadding && centeredRight <= viewportWidth - viewportPadding) {
                setPanelLayout('row');
                setPanelAlignment('center');
                return;
            }

            const rightAnchoredLeft = containerRect.right - rowWidth;
            if (rightAnchoredLeft >= viewportPadding) {
                setPanelLayout('row');
                setPanelAlignment('right');
                return;
            }

            const leftAnchoredRight = containerRect.left + rowWidth;
            if (leftAnchoredRight <= viewportWidth - viewportPadding) {
                setPanelLayout('row');
                setPanelAlignment('left');
                return;
            }

            const columnWidth = Math.min(208, viewportWidth - (viewportPadding * 2));
            const canAlignRightColumn = containerRect.right - columnWidth >= viewportPadding;
            const canAlignLeftColumn = containerRect.left + columnWidth <= viewportWidth - viewportPadding;

            let nextAlignment: CompactPanelAlignment = 'center';
            if (canAlignRightColumn && (!canAlignLeftColumn || containerRect.right > viewportWidth / 2)) {
                nextAlignment = 'right';
            } else if (canAlignLeftColumn) {
                nextAlignment = 'left';
            }

            setPanelLayout('column');
            setPanelAlignment(nextAlignment);
        };

        updatePanelPlacement();
        window.addEventListener('resize', updatePanelPlacement);

        return () => {
            window.removeEventListener('resize', updatePanelPlacement);
        };
    }, [expanded, resolvedOptions]);

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

    return (
        <div
            style={{ display: hidden ? 'none' : undefined }}
            ref={containerRef}
            className={`cvms${expanded ? ' cvms--open' : ''}`}
            onMouseEnter={openPanel}
            onMouseLeave={() => scheduleClosePanel()}
            onFocus={openPanel}
            onBlur={(e) => {
                if (!containerRef.current?.contains(e.relatedTarget as Node)) {
                    scheduleClosePanel(90);
                }
            }}
            onKeyDown={handleKeyDown}
        >
            {/* ── Chip / trigger ── */}
            <div className="cvms__chip">
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

                <button
                    className="cvms__trigger"
                    onClick={() => {
                        if (disabled) return;
                        clearCloseTimeout();
                        setExpanded((v) => {
                            const next = !v;
                            if (next) {
                                setPanelLayout('row');
                                setPanelAlignment('center');
                            }
                            return next;
                        });
                    }}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={expanded}
                    aria-label={triggerAriaLabel}
                >
                    <span className="cvms__trigger-content">
                        <span className="cvms__trigger-label">{currentLabel}</span>
                        {isHighlighted && highlightedLabel && (
                            <span className="cvms__indicator-dot" title={highlightedLabel} />
                        )}
                    </span>
                    <ChevronDown
                        className={`ui-icon ui-icon-sm cvms__chevron${expanded ? ' cvms__chevron--open' : ''}`}
                        aria-hidden="true"
                    />
                </button>

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
            </div>

            {/* ── Floating panel ── */}
            <div
                ref={panelRef}
                className={`cvms__panel cvms__panel--${panelLayout} cvms__panel--align-${panelAlignment}`}
                role="listbox"
                aria-label="Select view mode"
                onMouseEnter={clearCloseTimeout}
                onMouseLeave={() => scheduleClosePanel()}
            >
                {resolvedOptions.map((option) => {
                    const optionHighlighted = highlightedValue === option.value && highlightedLabel;

                    return (
                        <button
                            key={option.value}
                            className={`cvms__option${option.value === activeMode ? ' cvms__option--active' : ''}${optionHighlighted ? ' cvms__option--highlighted' : ''}`}
                            onClick={() => handleSelect(option.value)}
                            disabled={disabled}
                            role="option"
                            aria-selected={option.value === activeMode}
                            aria-label={optionHighlighted ? `${option.label}, ${highlightedLabel}` : option.label}
                            tabIndex={expanded ? 0 : -1}
                        >
                            <span className="cvms__option-content">
                                <span className="cvms__option-label">{option.label}</span>
                                {optionHighlighted && (
                                    <span className="cvms__indicator" aria-hidden="true">
                                        <span className="cvms__indicator-dot" title={highlightedLabel} />
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CompactViewModeSelector;
