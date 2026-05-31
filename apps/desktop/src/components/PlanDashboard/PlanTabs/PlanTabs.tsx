import React from 'react';
import { LayoutList, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAppDialogs } from '../../../hooks';
import { ConfirmDialog, ErrorDialog } from '../../_shared';
import type { TabConfig, TabPosition, TabDisplayMode } from '../../../types/tabs';
import type { TabId } from '../../../utils/tabManagement';
import TabPositionHandle from './TabPositionHandle';
import './PlanTabs.css';

interface PlanTabsProps {
  visibleTabs: TabConfig[];
  activeTab: TabId;
  onTabClick: (tab: TabId, options?: { resetBillsAnchor?: boolean }) => void;
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
  const {
    confirmDialog,
    errorDialog,
    openConfirmDialog,
    closeConfirmDialog,
    confirmCurrentDialog,
    openErrorDialog,
    closeErrorDialog,
  } = useAppDialogs();

  const handleHideTab = (e: React.MouseEvent, tab: TabConfig) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Check if this is the last visible tab
    if (visibleTabs.length <= 1) {
      openErrorDialog({
        title: 'Cannot Hide Tab',
        message: 'Cannot hide the last visible tab. At least one tab must remain visible.',
      });
      return;
    }
    
    openConfirmDialog({
      title: 'Hide Tab',
      message: `Are you sure you want to hide the ${tab.label} tab?`,
      confirmLabel: 'Hide Tab',
      confirmVariant: 'danger',
      onConfirm: () => onHideTab(tab.id),
    });
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
    <>
      <div className={`tab-navigation tab-position-${tabPosition} ${isSidebar ? `tab-display-${tabDisplayMode}` : ''}`}>
      {/* Tab Position Handle Display */}
      {onTabPositionChange && (
        <TabPositionHandle
          isSidebar={isSidebar}
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
            onClick={() => onTabClick(tab.id as TabId, tab.id === 'bills' ? { resetBillsAnchor: true } : undefined)}
            title={showLabels ? undefined : tab.label}
          >
            <span className="tab-icon"><tab.icon className="ui-icon" /></span>
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
          <span className="tab-icon"><LayoutList className="ui-icon" aria-hidden="true" /></span>
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
              {tabDisplayMode === 'icons-only' ? 
                <PanelLeftOpen className="ui-icon" aria-hidden="true" /> : 
                <PanelLeftClose className="ui-icon" aria-hidden="true" />
              }
            </span>
          </button>
        )}
      </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmDialog}
        onClose={closeConfirmDialog}
        onConfirm={confirmCurrentDialog}
        title={confirmDialog?.title || 'Confirm'}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        confirmVariant={confirmDialog?.confirmVariant}
      />

      <ErrorDialog
        isOpen={!!errorDialog}
        onClose={closeErrorDialog}
        title={errorDialog?.title || 'Error'}
        message={errorDialog?.message || ''}
        actionLabel={errorDialog?.actionLabel}
      />
    </>
  );
};

export default PlanTabs;
