import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { Button, Modal } from '../../_shared';
import { appFaqSections, type AppFaqSection } from '../../../data/appFaqs';
import './AppFaqModal.css';

interface AppFaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppFaqModal: React.FC<AppFaqModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>(appFaqSections[0].id);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const searchTokens = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );

  const visibleSections = useMemo<AppFaqSection[]>(() => {
    if (searchTokens.length === 0) {
      return appFaqSections;
    }

    return appFaqSections
      .map((section) => {
        const filteredItems = section.items.filter((item) => {
          const corpus = [
            section.title,
            section.description,
            section.searchTerms,
            item.question,
            item.answer,
            ...item.keywords,
          ]
            .join(' ')
            .toLowerCase();
          return searchTokens.every((token) => corpus.includes(token));
        });

        if (filteredItems.length === 0) {
          return null;
        }

        return {
          ...section,
          items: filteredItems,
        };
      })
        .filter((section): section is AppFaqSection => section !== null);
  }, [searchTokens]);

  const visibleSectionIds = useMemo(() => {
    return new Set(visibleSections.map((section) => section.id));
  }, [visibleSections]);

  useEffect(() => {
    if (visibleSections.length === 0) {
      return;
    }

    const firstVisible = visibleSections[0].id;
    if (!visibleSectionIds.has(activeSectionId)) {
      setActiveSectionId(firstVisible);
    }

    if (searchTokens.length > 0) {
      const firstQuestion = visibleSections[0].items[0];
      if (firstQuestion) {
        setExpandedIds((prev) => (prev.includes(firstQuestion.id) ? prev : [firstQuestion.id]));
      }
    }
  }, [activeSectionId, searchTokens.length, visibleSectionIds, visibleSections]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setQuery('');
    setActiveSectionId(appFaqSections[0].id);
    setExpandedIds([]);
  }, [isOpen]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  };

  const scrollToSection = (sectionId: string) => {
    const target = sectionRefs.current[sectionId];
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSectionId(sectionId);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header="App FAQs"
      headerIcon={<HelpCircle className="ui-icon" aria-hidden="true" />}
      contentClassName="app-faq-modal"
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="app-faq-search-wrap">
        <label htmlFor="app-faq-search" className="app-faq-search-label">Search FAQs</label>
        <input
          id="app-faq-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="app-faq-search-input"
          placeholder="Search questions, answers, or keywords"
          autoComplete="off"
        />
      </div>

      <div className="app-faq-layout">
        <aside className="app-faq-sidebar" aria-label="FAQ sections">
          {visibleSections.length === 0 ? (
            <p className="app-faq-sidebar-empty">No FAQ sections match your search.</p>
          ) : (
            visibleSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`app-faq-sidebar-item ${activeSectionId === section.id ? 'active' : ''}`}
                onClick={() => scrollToSection(section.id)}
              >
                {section.title}
              </button>
            ))
          )}
        </aside>

        <div className="app-faq-content">
          {visibleSections.length === 0 && (
            <div className="app-faq-empty-state" role="status">
              No matching FAQs found. Try broader keywords.
            </div>
          )}

          {visibleSections.map((section) => (
            <section
              key={section.id}
              className="app-faq-section"
              ref={(node) => {
                sectionRefs.current[section.id] = node;
              }}
            >
              <h3>{section.title}</h3>
              <p className="app-faq-section-description">{section.description}</p>

              <div className="app-faq-question-list">
                {section.items.map((item) => {
                  const expanded = expandedIds.includes(item.id);
                  const answerId = `faq-answer-${item.id}`;

                  return (
                    <article key={item.id} className={`app-faq-card ${expanded ? 'expanded' : ''}`}>
                      <button
                        type="button"
                        className="app-faq-question"
                        aria-expanded={expanded}
                        aria-controls={answerId}
                        onClick={() => toggleExpanded(item.id)}
                      >
                        <span>{item.question}</span>
                        <ChevronDown className="ui-icon ui-icon-sm app-faq-chevron" aria-hidden="true" />
                      </button>

                      {expanded && (
                        <div id={answerId} className="app-faq-answer">
                          <p>{item.answer}</p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default AppFaqModal;
