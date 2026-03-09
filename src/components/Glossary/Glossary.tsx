import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Button } from '../shared';
import {
  glossaryCategoryLabels,
  glossaryTerms,
  type GlossaryCategory,
} from '../../data/glossary';
import './Glossary.css';

interface GlossaryProps {
  isOpen: boolean;
  onClose: () => void;
  initialTermId?: string | null;
}

type CategoryFilter = 'all' | GlossaryCategory;

const Glossary: React.FC<GlossaryProps> = ({ isOpen, onClose, initialTermId }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !initialTermId) return;
    const initialTerm = glossaryTerms.find((term) => term.id === initialTermId);
    if (!initialTerm) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategory('all');
    setQuery(initialTerm.term);

    const timeoutId = window.setTimeout(() => {
      const target = document.getElementById(`glossary-term-${initialTerm.id}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, initialTermId]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredTerms = useMemo(() => {
    return glossaryTerms
      .filter((term) => {
        if (category !== 'all' && term.category !== category) return false;

        if (!normalizedQuery) return true;

        const searchableParts = [
          term.term,
          term.shortDefinition,
          term.fullDefinition,
          ...(term.aliases || []),
          ...(term.tags || []),
        ];

        return searchableParts.some((part) =>
          part.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [category, normalizedQuery]);

  const getTermById = (id: string) => glossaryTerms.find((term) => term.id === id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header="Glossary of Terms"
      contentClassName="glossary-modal"
      footer={
        <div className="glossary-footer-actions">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="glossary-intro">
        <p>
          Search financial terms used throughout Paycheck Planner. Use this glossary to understand
          calculations like gross pay, net pay, deductions, taxes, and allocations.
        </p>
      </div>

      <div className="glossary-controls">
        <input
          ref={searchRef}
          type="text"
          className="glossary-search"
          placeholder="Search terms, definitions, or keywords..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search glossary terms"
        />

        <div className="glossary-categories" role="tablist" aria-label="Glossary categories">
          <button
            className={`glossary-category-btn ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
            type="button"
          >
            All
          </button>
          {(Object.keys(glossaryCategoryLabels) as GlossaryCategory[]).map((key) => (
            <button
              key={key}
              className={`glossary-category-btn ${category === key ? 'active' : ''}`}
              onClick={() => setCategory(key)}
              type="button"
            >
              {glossaryCategoryLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="glossary-helpful-resources">
        <h3>Helpful Resources</h3>
        <p>
          Tip: Open this glossary anytime from the menu bar via <strong>Help -&gt; Glossary of Terms</strong>.
        </p>
      </div>

      <div className="glossary-results-meta">
        <span>{filteredTerms.length} term{filteredTerms.length === 1 ? '' : 's'} found</span>
        {(query || category !== 'all') && (
          <button
            type="button"
            className="glossary-clear-filters"
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="glossary-list" role="list">
        {filteredTerms.length === 0 && (
          <div className="glossary-empty-state">
            <h4>No terms matched your search.</h4>
            <p>Try another keyword or clear filters to browse all glossary terms.</p>
          </div>
        )}

        {filteredTerms.map((term) => (
          <article className="glossary-card" id={`glossary-term-${term.id}`} key={term.id} role="listitem">
            <div className="glossary-card-header">
              <h4>{term.term}</h4>
              <span className="glossary-badge">{glossaryCategoryLabels[term.category]}</span>
            </div>

            <p className="glossary-short">{term.shortDefinition}</p>
            <p className="glossary-full">{term.fullDefinition}</p>

            {!!term.aliases?.length && (
              <p className="glossary-meta-line">
                <strong>Also called:</strong> {term.aliases.join(', ')}
              </p>
            )}

            {!!term.tags?.length && (
              <p className="glossary-meta-line">
                <strong>Keywords:</strong> {term.tags.join(', ')}
              </p>
            )}

            {!!term.relatedTermIds?.length && (
              <div className="glossary-related">
                <strong>Related terms:</strong>
                <div className="glossary-related-links">
                  {term.relatedTermIds
                    .map((relatedId) => getTermById(relatedId))
                    .filter(Boolean)
                    .map((related) => (
                      <button
                        key={related!.id}
                        type="button"
                        className="glossary-related-link"
                        onClick={() => {
                          setQuery(related!.term);
                          setCategory('all');
                        }}
                      >
                        {related!.term}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </Modal>
  );
};

export default Glossary;
