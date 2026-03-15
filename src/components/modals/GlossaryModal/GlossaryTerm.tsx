import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { APP_CUSTOM_EVENTS } from '../../../constants/events';
import { FileStorageService } from '../../../services/fileStorage';
import { glossaryTerms } from '../../../data/glossary';
import './GlossaryTerm.css';

interface GlossaryTermProps {
  termId: string;
  children: React.ReactNode;
  className?: string;
}

const GlossaryTerm: React.FC<GlossaryTermProps> = ({ termId, children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [termsEnabled, setTermsEnabled] = useState(() => {
    return FileStorageService.getAppSettings().glossaryTermsEnabled !== false;
  });
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  const term = useMemo(() => glossaryTerms.find((item) => item.id === termId), [termId]);

  useEffect(() => {
    const handleChange = (event: Event) => {
      const e = event as CustomEvent<{ enabled: boolean }>;
      setTermsEnabled(e.detail.enabled);
      if (!e.detail.enabled) setIsOpen(false);
    };
    window.addEventListener(APP_CUSTOM_EVENTS.glossaryTermsChanged, handleChange as EventListener);
    return () => window.removeEventListener(APP_CUSTOM_EVENTS.glossaryTermsChanged, handleChange as EventListener);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !termsEnabled || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;

      const rect = anchorRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const maxTooltipWidth = Math.min(320, Math.floor(viewportWidth * 0.75));
      const halfWidth = maxTooltipWidth / 2;
      const gutter = 12;

      let left = rect.left + rect.width / 2;
      left = Math.max(gutter + halfWidth, Math.min(left, viewportWidth - gutter - halfWidth));

      const spaceAbove = rect.top;
      const estimatedHeight = 120;
      const placeAbove = spaceAbove > estimatedHeight + gutter;

      const top = placeAbove ? rect.top - 8 : rect.bottom + 8;

      setTooltipStyle({
        left,
        top,
        maxWidth: `${maxTooltipWidth}px`,
        transform: placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, termsEnabled]);

  // Unknown term or glossary disabled: keep original casing while rendering plain text.
  if (!term || !termsEnabled) {
    return <span className="glossary-term-static">{children}</span>;
  }

  const openGlossary = () => {
    window.dispatchEvent(
      new CustomEvent(APP_CUSTOM_EVENTS.openGlossary, {
        detail: { termId },
      })
    );
  };

  return (
    <span
      ref={anchorRef}
      className={`glossary-term ${className}`.trim()}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="glossary-term-button"
        onClick={openGlossary}
        aria-label={`${term.term}: ${term.shortDefinition}. Click for full definition.`}
      >
        {children}
      </button>
      {isOpen && createPortal(
        <span className="glossary-term-tooltip" style={tooltipStyle} role="tooltip">
          <strong>{term.term}:</strong> {term.shortDefinition}
          <span className="glossary-term-tooltip-hint">Click to open full glossary entry.</span>
        </span>,
        document.body
      )}
    </span>
  );
};

export default GlossaryTerm;
