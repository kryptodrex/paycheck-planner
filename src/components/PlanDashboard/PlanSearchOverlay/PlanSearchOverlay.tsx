import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchPlan } from '../../../utils/planSearch';
import type { SearchResult } from '../../../utils/planSearch';
import type { SearchResultAction } from '../../../utils/planSearch';
import type { BudgetData } from '../../../types/budget';
import Button from '../../_shared/controls/Button';
import './PlanSearchOverlay.css';

const TOGGLE_BADGE_FEEDBACK_MS = 1800;

const isToggleAction = (action: SearchResultAction): boolean => {
  if (action.type === 'open-bills-action') {
    return action.mode === 'toggle-bill' || action.mode === 'toggle-benefit';
  }

  if (action.type === 'open-loans-action') {
    return action.mode === 'toggle-loan';
  }

  if (action.type === 'open-savings-action') {
    return action.mode === 'toggle-savings' || action.mode === 'toggle-retirement';
  }

  return false;
};

interface PlanSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  budgetData: BudgetData;
  onNavigate: (result: SearchResult) => void;
}

const PlanSearchOverlay: React.FC<PlanSearchOverlayProps> = ({
  isOpen,
  onClose,
  budgetData,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [badgeOverrides, setBadgeOverrides] = useState<Record<string, string | null>>({});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLUListElement | null>(null);
  const activeItemRef = useRef<HTMLLIElement | null>(null);
  const badgeOverrideTimersRef = useRef<Record<string, number>>({});

  const results: SearchResult[] = useMemo(
    () => searchPlan(query, budgetData),
    [query, budgetData],
  );

  const displayResults: SearchResult[] = useMemo(() => {
    return results.map((result) => {
      if (!(result.id in badgeOverrides)) {
        return result;
      }

      const overrideBadge = badgeOverrides[result.id];
      return {
        ...result,
        badge: overrideBadge ?? undefined,
      };
    });
  }, [badgeOverrides, results]);

  // Clamp active index to valid range
  const clampedActiveIndex = displayResults.length > 0 ? Math.min(activeIndex, displayResults.length - 1) : 0;

  // Reset state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      // Reset query/cursor when the overlay closes so it opens fresh next time.
      // We deliberately reset on close rather than on open to avoid a
      // flicker of stale content before the fade-out animation finishes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setActiveIndex(0);
      setBadgeOverrides({});
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      Object.values(badgeOverrideTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      badgeOverrideTimersRef.current = {};
    };
  }, []);

  // Scroll active result into view
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [clampedActiveIndex]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onNavigate(result);
      onClose();
    },
    [onNavigate, onClose],
  );

  const handleInlineActionSelect = useCallback(
    (result: SearchResult, action: SearchResultAction) => {
      if (isToggleAction(action)) {
        const nextBadge = result.badge === 'Paused' ? null : 'Paused';
        setBadgeOverrides((prev) => ({
          ...prev,
          [result.id]: nextBadge,
        }));

        const existingTimer = badgeOverrideTimersRef.current[result.id];
        if (existingTimer) {
          window.clearTimeout(existingTimer);
        }

        badgeOverrideTimersRef.current[result.id] = window.setTimeout(() => {
          setBadgeOverrides((prev) => {
            const next = { ...prev };
            delete next[result.id];
            return next;
          });
          delete badgeOverrideTimersRef.current[result.id];
        }, TOGGLE_BADGE_FEEDBACK_MS);
      }

      onNavigate({ ...result, action });

      if (!isToggleAction(action)) {
        onClose();
      }
    },
    [onNavigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, displayResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (displayResults[clampedActiveIndex]) {
            handleSelect(displayResults[clampedActiveIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    },
    [displayResults, clampedActiveIndex, handleSelect, onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className="plan-search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Plan search"
      onClick={onClose}
    >
      <div
        className="plan-search-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="plan-search-input-row">
          <span className="plan-search-icon" aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="plan-search-input"
            placeholder="Search your plan — bills, loans, savings, pay settings…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
              setBadgeOverrides({});
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search plan"
            aria-autocomplete="list"
            aria-controls="plan-search-results"
            aria-activedescendant={
              displayResults.length > 0 ? `plan-search-result-${clampedActiveIndex}` : undefined
            }
          />
          {query && (
            <button
              type="button"
              className="plan-search-clear-btn"
              onClick={() => {
                setQuery('');
                setBadgeOverrides({});
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Results list */}
        {query.trim() !== '' && (
          <ul
            id="plan-search-results"
            ref={resultsRef}
            className="plan-search-results"
            role="listbox"
            aria-label="Search results"
          >
            {displayResults.length === 0 ? (
              <li className="plan-search-empty" role="option" aria-selected="false">
                No results for <strong>{query}</strong>
              </li>
            ) : (
              displayResults.map((result, index) => (
                <div
                  key={result.id}
                  id={`plan-search-result-${index}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  className="plan-search-result-wrapper"
                >
                  <li
                    onClick={() => handleSelect(result)}
                    ref={index === clampedActiveIndex ? activeItemRef : null}
                    className={`plan-search-result${index === clampedActiveIndex ? ' active' : ''}`}
                    role="option"
                    aria-selected={index === clampedActiveIndex}
                  >
                    <span className="plan-search-result-icon" aria-hidden="true">
                      {result.categoryIcon}
                    </span>
                    <div className="plan-search-result-body">
                      <div className="plan-search-result-title-row">
                        <span className="plan-search-result-title">{result.title}</span>
                        {result.badge && (
                          <span className="plan-search-result-badge">{result.badge}</span>
                        )}
                      </div>
                      {result.subtitle && (
                        <span className="plan-search-result-subtitle">{result.subtitle}</span>
                      )}
                    </div>
                    <div className="plan-search-result-meta">
                      <span className="plan-search-result-category">{result.category}</span>
                    </div>
                  </li>
                  {result.inlineActions && result.inlineActions.length > 0 && (
                    <div className={`actions-container${index === clampedActiveIndex ? ' active' : ''}`}>
                      {/* <span className="plan-search-result-subtitle">Quick actions:</span> */}
                      <div className="plan-search-result-inline-actions item-card-actions" role="group" aria-label={`Actions for ${result.title}`}>
                        {result.inlineActions.map((inlineAction) => (
                          <Button
                            key={inlineAction.id}
                            variant="utility"
                            className={[
                              inlineAction.label === 'Pause' ? 'item-card-btn-pause' : '',
                              inlineAction.label === 'Resume' ? 'item-card-btn-resume' : '',
                              inlineAction.label === 'Delete' ? 'item-card-btn-delete' : '',
                            ].filter(Boolean).join(' ')}
                            successText={
                              inlineAction.label === 'Pause'
                                ? 'Paused'
                                : inlineAction.label === 'Resume'
                                  ? 'Resumed'
                                  : undefined
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              handleInlineActionSelect(result, inlineAction.action);
                            }}
                          >
                            {inlineAction.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </ul>
        )}

        {/* Footer hint */}
        <div className="plan-search-footer" aria-hidden="true">
          <span>
            <kbd>↑</kbd><kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> select
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlanSearchOverlay;
