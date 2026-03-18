import React, { useEffect, useRef, useCallback } from 'react';
import type { TabConfig } from '../../../types/tabs';
import './MobileNavDrawer.css';

type TabView = 'metrics' | 'breakdown' | 'bills' | 'loans' | 'savings' | 'taxes';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  visibleTabs: TabConfig[];
  activeTab: TabView;
  onTabClick: (tab: TabView) => void;
  onManageTabs: () => void;
}

const SWIPE_EDGE_THRESHOLD = 24; // px from left edge to start a swipe
const SWIPE_OPEN_MIN_DISTANCE = 50; // px moved right to commit open

/**
 * Mobile slide-out navigation drawer.
 *
 * - Opens by tapping the hamburger trigger in the header OR by swiping right
 *   from within ~24 px of the left screen edge.
 * - A thin edge-hint pill at the left provides a persistent visual cue.
 * - Closes on backdrop tap, Escape key, or tab selection.
 */
const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onOpen,
  onClose,
  visibleTabs,
  activeTab,
  onTabClick,
  onManageTabs,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isEdgeSwipeRef = useRef(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset stale touch tracking whenever the drawer is opened externally
  // (e.g. via the hamburger button) so a partially-started swipe can't
  // misfire on the next touchend event.
  useEffect(() => {
    if (isOpen) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      isEdgeSwipeRef.current = false;
    }
  }, [isOpen]);
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Touch swipe from left edge to open
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isEdgeSwipeRef.current = touch.clientX <= SWIPE_EDGE_THRESHOLD;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!isEdgeSwipeRef.current || touchStartXRef.current === null || touchStartYRef.current === null) {
        return;
      }

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartXRef.current;
      const dy = Math.abs(touch.clientY - touchStartYRef.current);

      // Only open for primarily horizontal rightward swipes
      if (dx >= SWIPE_OPEN_MIN_DISTANCE && dy < dx * 0.6 && !isOpen) {
        onOpen();
      }

      touchStartXRef.current = null;
      touchStartYRef.current = null;
      isEdgeSwipeRef.current = false;
    },
    [isOpen, onOpen],
  );

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  const handleTabSelect = (tab: TabView) => {
    onTabClick(tab);
    onClose();
  };

  const handleManageTabs = () => {
    onManageTabs();
    onClose();
  };

  return (
    <>
      {/* Thin edge-hint pill visible when drawer is closed */}
      {!isOpen && <div className="mobile-nav-edge-hint" aria-hidden="true" />}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`mobile-nav-drawer${isOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!isOpen}
      >
        <div className="mobile-nav-drawer-header">
          <h2>Navigation</h2>
          <button
            className="mobile-nav-close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            ×
          </button>
        </div>

        <nav className="mobile-nav-tab-list" aria-label="Tab navigation">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              className={`mobile-nav-tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => handleTabSelect(tab.id as TabView)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="mobile-nav-tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="mobile-nav-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="mobile-nav-drawer-footer">
          <button
            className="mobile-nav-manage-btn"
            onClick={handleManageTabs}
            aria-label="Manage tabs"
          >
            <span aria-hidden="true">✏️</span>
            <span>Manage Tabs</span>
          </button>
        </div>
      </div>
    </>
  );
};

export { MobileNavDrawer };
export type { MobileNavDrawerProps };
