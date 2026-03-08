import React from 'react';
import type { TabConfig } from '../../../types/auth';
import './PlanTabs.css';

type TabView = 'metrics' | 'breakdown' | 'bills' | 'loans' | 'benefits' | 'taxes';

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

  return (
    <div className="tab-navigation">
      {visibleTabs.map((tab, index) => (
        <div
          key={tab.id}
          className="tab-button-group"
          draggable={true}
          onDragStart={() => onDragStart(index)}
          onDragOver={(e) => onDragOver(e, index)}
          onDrop={(e) => onDrop(e, index)}
          onDragEnd={onDragEnd}
          style={{
            cursor: 'grab',
            opacity: draggedTabIndex === index ? 0.5 : 1,
          }}
        >
          <button
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabClick(tab.id as TabView, tab.id === 'bills' ? { resetBillsAnchor: true } : undefined)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
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
      
      {/* Manage Tabs Button */}
      <div className="tab-button-group manage-tabs-container">
        <button
          className="tab-button manage-tabs-button"
          onClick={onManageTabs}
          title="Manage tabs"
          aria-label="Manage tabs"
        >
          <span className="tab-icon">+</span>
        </button>
      </div>
    </div>
  );
};

export default PlanTabs;
