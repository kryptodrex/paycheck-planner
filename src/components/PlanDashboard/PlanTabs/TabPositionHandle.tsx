import React, { useState, useRef, useEffect } from 'react';
import type { TabPosition } from '../../../types/tabs';
import { GripVertical, GripHorizontal } from 'lucide-react';
import './TabPositionHandle.css';

interface TabPositionHandleProps {
  isSidebar?: boolean;
  currentPosition: TabPosition;
  onPositionChange: (position: TabPosition) => void;
}

const TabPositionHandle: React.FC<TabPositionHandleProps> = ({ isSidebar = true, currentPosition, onPositionChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [targetPosition, setTargetPosition] = useState<TabPosition | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const pendingTargetPositionRef = useRef<TabPosition | null>(null);
  const dropHandledRef = useRef(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    };

    const handleWindowDrop = (event: DragEvent) => {
      event.preventDefault();
      dropHandledRef.current = true;

      const pendingTarget = pendingTargetPositionRef.current;
      if (pendingTarget && pendingTarget !== currentPosition) {
        onPositionChange(pendingTarget);
      }

      setIsDragging(false);
      setTargetPosition(null);
      pendingTargetPositionRef.current = null;
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [isDragging, currentPosition, onPositionChange]);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    pendingTargetPositionRef.current = null;
    dropHandledRef.current = false;
    // Set identifier so tabs know this is NOT a tab being dragged
    e.dataTransfer.setData('text/tab-position-handle', 'true');
    e.dataTransfer.effectAllowed = 'move';
    // Create a custom drag image with the grip icon
    const rootStyle = getComputedStyle(document.documentElement);
    const accentPrimary = rootStyle.getPropertyValue('--accent-primary').trim() || '#667eea';
    const textInverse = rootStyle.getPropertyValue('--text-inverse').trim() || '#ffffff';
    const shadowMd = rootStyle.getPropertyValue('--shadow-md').trim() || '0 4px 12px rgba(0, 0, 0, 0.2)';

    const dragImage = document.createElement('div');
    dragImage.innerHTML = '⋮⋮';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.fontSize = '1.5rem';
    dragImage.style.padding = '0.5rem';
    dragImage.style.background = accentPrimary;
    dragImage.style.color = textInverse;
    dragImage.style.opacity = '0.92';
    dragImage.style.borderRadius = '8px';
    dragImage.style.boxShadow = shadowMd;
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
    // Divide screen into zones.
    // Left/right use a larger adaptive threshold so side docking feels responsive
    // even on wider windows.
    const verticalEdgeThreshold = 100;
    const horizontalEdgeThreshold = Math.min(260, Math.max(140, Math.floor(viewportWidth * 0.18)));
    
    let newTarget: TabPosition | null = null;
    
    if (y < verticalEdgeThreshold) {
      newTarget = 'top';
    } else if (y > viewportHeight - verticalEdgeThreshold) {
      newTarget = 'bottom';
    } else if (x < horizontalEdgeThreshold) {
      newTarget = 'left';
    } else if (x > viewportWidth - horizontalEdgeThreshold) {
      newTarget = 'right';
    }

    // Do not preview the zone if it's already the current position.
    if (newTarget === currentPosition) {
      newTarget = null;
    }
    
    setTargetPosition(newTarget);
    pendingTargetPositionRef.current = newTarget;
  };

  const handleDragEnd = () => {
    // If drop already handled on overlay, skip duplicate apply on drag end.
    if (dropHandledRef.current) {
      setIsDragging(false);
      setTargetPosition(null);
      pendingTargetPositionRef.current = null;
      dropHandledRef.current = false;
      return;
    }

    const pendingTarget = pendingTargetPositionRef.current;
    setIsDragging(false);
    setTargetPosition(null);
    pendingTargetPositionRef.current = null;

    if (pendingTarget && pendingTarget !== currentPosition) {
      onPositionChange(pendingTarget);
    }
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
        {
          isSidebar ? <GripHorizontal className="tab-position-grip ui-icon" aria-hidden="true" /> : <GripVertical className="tab-position-grip ui-icon" aria-hidden="true" />
        }
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
