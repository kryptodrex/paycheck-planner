import React from 'react';
import type { TabConfig, TabPosition, TabDisplayMode } from '../../../types/tabs';
import TabPositionHandle from './TabPositionHandle';
import './PlanTabs.css';

type TabView = 'metrics' | 'breakdown' | 'bills' | 'loans' | 'savings' | 'taxes';

interface PlanTabsProps {
  visibleTabs: TabConfig[];
  activeTab: TabView;
  onTabClick: (tab: TabView, options?: { resetBillsAnchor?: boolean }) => void;
  onManageTabs: () => void;
  onHideTab: (tabId: string) => void;
  draggedTabIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  dropTargetIndex: number | null;
  tabPosition?: TabPosition;
  tabDisplayMode?: TabDisplayMode;
  onTabPositionChange?: (position: TabPosition) => void;
  onTabDisplayModeChange?: (mode: TabDisplayMode) => void;
}

const PlanTabs: React.FC<PlanTabsProps> = ({
  visibleTabs,
  activeTab,
  onTabClick,
  onManageTabs,
  onHideTab,
  draggedTabIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dropTargetIndex,
  tabPosition = 'top',
  tabDisplayMode = 'icons-with-labels',
  onTabPositionChange,
  onTabDisplayModeChange,
}) => {
  const handleHideTab = (e: React.MouseEvent, tab: TabConfig) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Check if this is the last visible tab
    if (visibleTabs.length <= 1) {
      alert('Cannot hide the last visible tab. At least one tab must remain visible.');
      return;
    }
    
    const confirmed = window.confirm(`Are you sure you want to hide the ${tab.label} tab?`);
    if (confirmed) {
      onHideTab(tab.id);
    }
  };

  const isSidebar = tabPosition === 'left' || tabPosition === 'right';
  const showLabels = !isSidebar || tabDisplayMode === 'icons-with-labels';
  const showManageLabel = isSidebar && tabDisplayMode === 'icons-with-labels';

  const handleToggleDisplayMode = () => {
    if (onTabDisplayModeChange) {
      const newMode: TabDisplayMode = tabDisplayMode === 'icons-only' ? 'icons-with-labels' : 'icons-only';
      onTabDisplayModeChange(newMode);
    }
  };

  const handleTabDragStart = (e: React.DragEvent, index: number) => {
    // Force drag operation to be treated as a move so macOS doesn't show copy (+) cursor.
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/tab-index', String(index));
    onDragStart(index);
  };

  const handleTabDragOver = (e: React.DragEvent, index: number) => {
    e.dataTransfer.dropEffect = 'move';
    onDragOver(e, index);
  };

  return (
    <div className={`tab-navigation tab-position-${tabPosition} ${isSidebar ? `tab-display-${tabDisplayMode}` : ''}`}>
      {/* Tab Position Handle Display */}
      {onTabPositionChange && (
        <TabPositionHandle
          currentPosition={tabPosition}
          onPositionChange={onTabPositionChange}
        />
      )}
      
      {visibleTabs.map((tab, index) => (
        <div
          key={tab.id}
          className={`tab-button-group ${dropTargetIndex === index ? 'drag-over-target' : ''} ${draggedTabIndex === index ? 'is-dragging' : ''}`}
          draggable={true}
          onDragStart={(e) => handleTabDragStart(e, index)}
          onDragOver={(e) => handleTabDragOver(e, index)}
          onDrop={(e) => onDrop(e, index)}
          onDragEnd={onDragEnd}
          style={{
            opacity: draggedTabIndex === index ? 0.5 : 1,
          }}
        >
          <button
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabClick(tab.id as TabView, tab.id === 'bills' ? { resetBillsAnchor: true } : undefined)}
            title={showLabels ? undefined : tab.label}
          >
            <span className="tab-icon">{tab.icon}</span>
            {showLabels && <span className="tab-label">{tab.label}</span>}
          </button>
          <button
            className="tab-close-button"
            onClick={(e) => handleHideTab(e, tab)}
            title={`Hide ${tab.label} tab`}
            aria-label={`Hide ${tab.label} tab`}
          >
            ×
          </button>
        </div>
      ))}

      {isSidebar && <span className="spacer" />}
      
      {/* Manage Tabs Button */}
      <div className="tab-button-group manage-tabs-container">
        <button
          className="tab-button manage-tabs-button"
          onClick={onManageTabs}
          title="Manage tabs"
          aria-label="Manage tabs"
        >
          <span className="tab-icon">✏️</span>
          {showManageLabel && <span className="tab-label">Manage Tabs</span>}
        </button>
      </div>

      <div className="tab-controls">
        {/* Display Mode Toggle - only show for sidebar positions */}
        {isSidebar && onTabDisplayModeChange && (
          <button
            className="display-mode-toggle"
            onClick={handleToggleDisplayMode}
            title={tabDisplayMode === 'icons-only' ? 'Show labels' : 'Hide labels'}
            aria-label={tabDisplayMode === 'icons-only' ? 'Show tab labels' : 'Hide tab labels'}
          >
            <span className="toggle-icon">
              {/* TODO: Update the icon with a proper SVG or icon component later */}
              {tabDisplayMode === 'icons-only' ? '>|' : '|<'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanTabs;
