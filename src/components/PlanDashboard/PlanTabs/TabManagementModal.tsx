import React, { useState } from 'react';
import { Modal, Button } from '../../shared';
import type { TabConfig } from '../../../types/tabs';
import './PlanTabs.css';
import './TabManagementModal.css';

interface TabManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleTabs: TabConfig[];
  hiddenTabs: TabConfig[];
  onToggleTabVisibility: (tabId: string, visible: boolean) => void;
  onReorderTab: (fromIndex: number, toIndex: number) => void;
}

const TabManagementModal: React.FC<TabManagementModalProps> = ({
  isOpen,
  onClose,
  visibleTabs,
  hiddenTabs,
  onToggleTabVisibility,
  onReorderTab,
}) => {
  const [animatingIndices, setAnimatingIndices] = useState<{ from: number; to: number } | null>(null);

  const handleReorder = (fromIndex: number, toIndex: number) => {
    // Set animation state
    setAnimatingIndices({ from: fromIndex, to: toIndex });
    
    // Wait for animation to complete before actually reordering
    setTimeout(() => {
      onReorderTab(fromIndex, toIndex);
      setAnimatingIndices(null);
    }, 300); // Match this with CSS animation duration
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header="📋 Manage Tabs"
      footer={
        <Button
          variant="primary"
          onClick={onClose}
        >
          Done
        </Button>
      }
    >
      <div className="tab-management-content">
        <p className="tab-management-description">
          Customize which tabs are visible and their order. You can hide tabs you don't use often to declutter your dashboard, and rearrange them based on your preferences. One tab must remain visible at all times.
        </p>
        
        <div className="tab-management-sections">
          {/* Visible Tabs Section */}
          <div className="tab-management-section">
            <h3>Visible Tabs</h3>
            <div className="tab-list">
              {visibleTabs.map((tab, index) => {
                const isMovingUp = animatingIndices?.from === index && animatingIndices?.to === index - 1;
                const isMovingDown = animatingIndices?.from === index && animatingIndices?.to === index + 1;
                const isBeingDisplacedUp = animatingIndices?.from === index - 1 && animatingIndices?.to === index;
                const isBeingDisplacedDown = animatingIndices?.from === index + 1 && animatingIndices?.to === index;
                
                const upArrowWillDisappear = isMovingDown && index === 0;
                const downArrowWillDisappear = isMovingUp && index === visibleTabs.length - 1;
                
                const animationClass = 
                  isMovingUp ? 'tab-item-moving-up' :
                  isMovingDown ? 'tab-item-moving-down' :
                  isBeingDisplacedUp ? 'tab-item-displaced-down' :
                  isBeingDisplacedDown ? 'tab-item-displaced-up' :
                  '';
                
                return (
                  <div 
                    key={tab.id} 
                    className={`tab-management-item ${animationClass}`}
                  >
                    <div className="tab-info">
                      <span className="tab-icon">{tab.icon}</span>
                      <span className="tab-label">{tab.label}</span>
                    </div>
                    <div className="tab-actions">
                      {(index > 0 || upArrowWillDisappear) && (
                        <button
                          className={`tab-action-btn ${upArrowWillDisappear ? 'arrow-fade-out' : ''}`}
                          onClick={() => handleReorder(index, index - 1)}
                          title="Move up"
                          aria-label="Move up"
                          disabled={!!animatingIndices || upArrowWillDisappear}
                        >
                          ↑
                        </button>
                      )}
                      {(index < visibleTabs.length - 1 || downArrowWillDisappear) && (
                        <button
                          className={`tab-action-btn ${downArrowWillDisappear ? 'arrow-fade-out' : ''}`}
                          onClick={() => handleReorder(index, index + 1)}
                          title="Move down"
                          aria-label="Move down"
                          disabled={!!animatingIndices || downArrowWillDisappear}
                        >
                          ↓
                        </button>
                      )}
                      <button
                        className="tab-action-btn tab-action-hide"
                        onClick={() => onToggleTabVisibility(tab.id, false)}
                        title={visibleTabs.length <= 1 ? "Cannot hide the last visible tab" : "Hide tab"}
                        aria-label="Hide tab"
                        disabled={visibleTabs.length <= 1 || !!animatingIndices}
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hidden Tabs Section */}
          {hiddenTabs.length > 0 && (
            <div className="tab-management-section">
              <h3>Hidden Tabs</h3>
              <div className="tab-list">
                {hiddenTabs.map((tab) => (
                  <div key={tab.id} className="tab-management-item">
                    <div className="tab-info">
                      <span className="tab-icon">{tab.icon}</span>
                      <span className="tab-label">{tab.label}</span>
                    </div>
                    <div className="tab-actions">
                      <button
                        className="tab-action-btn tab-action-show"
                        onClick={() => onToggleTabVisibility(tab.id, true)}
                        title="Show tab"
                        aria-label="Show tab"
                      >
                        Show
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TabManagementModal;
