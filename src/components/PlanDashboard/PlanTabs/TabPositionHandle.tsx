import React, { useState, useRef } from 'react';
import type { TabPosition } from '../../../types/auth';
import './TabPositionHandle.css';

interface TabPositionHandleProps {
  currentPosition: TabPosition;
  onPositionChange: (position: TabPosition) => void;
}

const TabPositionHandle: React.FC<TabPositionHandleProps> = ({ currentPosition, onPositionChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [targetPosition, setTargetPosition] = useState<TabPosition | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    // Create a custom drag image with the grip icon
    const dragImage = document.createElement('div');
    dragImage.innerHTML = '⋮⋮';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.fontSize = '1.5rem';
    dragImage.style.padding = '0.5rem';
    dragImage.style.background = 'rgba(102, 126, 234, 0.9)';
    dragImage.style.color = 'white';
    dragImage.style.borderRadius = '8px';
    dragImage.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 20, 20);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return; // Ignore final drag event
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const x = e.clientX;
    const y = e.clientY;

    // Determine target position based on cursor location
    // Divide screen into zones
    const edgeThreshold = 100; // Distance from edge to trigger position change
    
    let newTarget: TabPosition | null = null;
    
    if (y < edgeThreshold) {
      newTarget = 'top';
    } else if (y > viewportHeight - edgeThreshold) {
      newTarget = 'bottom';
    } else if (x < edgeThreshold) {
      newTarget = 'left';
    } else if (x > viewportWidth - edgeThreshold) {
      newTarget = 'right';
    }
    
    setTargetPosition(newTarget);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    
    if (targetPosition && targetPosition !== currentPosition) {
      onPositionChange(targetPosition);
    }
    
    setTargetPosition(null);
  };

  return (
    <>
      <div
        ref={handleRef}
        className="tab-position-handle"
        draggable
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        title="Drag to reposition tab bar"
      >
        <span className="tab-position-grip">⋮⋮</span>
      </div>
      
      {isDragging && targetPosition && (
        <div className={`tab-position-indicator tab-position-indicator-${targetPosition}`}>
          <div className="tab-position-indicator-label">
            {targetPosition.charAt(0).toUpperCase() + targetPosition.slice(1)}
          </div>
        </div>
      )}
    </>
  );
};

export default TabPositionHandle;
