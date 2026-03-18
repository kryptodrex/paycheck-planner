import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchPlan } from '../../../utils/planSearch';
import type { SearchResult } from '../../../utils/planSearch';
import type { BudgetData } from '../../../types/budget';
import './PlanSearchOverlay.css';

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLUListElement | null>(null);
  const activeItemRef = useRef<HTMLLIElement | null>(null);

  const results: SearchResult[] = useMemo(
    () => searchPlan(query, budgetData),
    [query, budgetData],
  );

  // Clamp active index to valid range
  const clampedActiveIndex = results.length > 0 ? Math.min(activeIndex, results.length - 1) : 0;

  // Reset state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      // Reset query/cursor when the overlay closes so it opens fresh next time.
      // We deliberately reset on close rather than on open to avoid a
      // flicker of stale content before the fade-out animation finishes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setActiveIndex(0);
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [isOpen]);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[clampedActiveIndex]) {
            handleSelect(results[clampedActiveIndex]);
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
    [results, clampedActiveIndex, handleSelect, onClose],
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
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search plan"
            aria-autocomplete="list"
            aria-controls="plan-search-results"
            aria-activedescendant={
              results.length > 0 ? `plan-search-result-${clampedActiveIndex}` : undefined
            }
          />
          {query && (
            <button
              type="button"
              className="plan-search-clear-btn"
              onClick={() => {
                setQuery('');
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
            {results.length === 0 ? (
              <li className="plan-search-empty" role="option" aria-selected="false">
                No results for <strong>{query}</strong>
              </li>
            ) : (
              results.map((result, index) => (
                <li
                  key={result.id}
                  id={`plan-search-result-${index}`}
                  ref={index === clampedActiveIndex ? activeItemRef : null}
                  className={`plan-search-result${index === clampedActiveIndex ? ' active' : ''}`}
                  role="option"
                  aria-selected={index === clampedActiveIndex}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="plan-search-result-icon" aria-hidden="true">
                    {result.categoryIcon}
                  </span>
                  <div className="plan-search-result-body">
                    <span className="plan-search-result-title">{result.title}</span>
                    {result.subtitle && (
                      <span className="plan-search-result-subtitle">{result.subtitle}</span>
                    )}
                  </div>
                  <div className="plan-search-result-meta">
                    {result.badge && (
                      <span className="plan-search-result-badge">{result.badge}</span>
                    )}
                    <span className="plan-search-result-category">{result.category}</span>
                  </div>
                </li>
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
