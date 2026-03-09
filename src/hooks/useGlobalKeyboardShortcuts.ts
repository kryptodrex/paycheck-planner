import { useEffect } from 'react';

export interface ShortcutConfig {
  key: string;
  mac?: boolean;        // Trigger on Mac with Cmd key
  windows?: boolean;    // Trigger on Windows/Linux with Ctrl key
  shift?: boolean;      // Shift modifier required
  alt?: boolean;        // Alt modifier required
  callback: (e: KeyboardEvent) => void;
}

/**
 * Global keyboard shortcuts hook
 * Handles keyboard shortcuts at the capture phase to ensure they work even if child components consume events
 * Listens on both window and document to catch events regardless of focus
 * 
 * Platform detection:
 * - mac: true registers Cmd+key on Mac only
 * - windows: true registers Ctrl+key on Windows/Linux only
 * 
 * @param shortcuts Array of shortcut configurations
 */
export const useGlobalKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  useEffect(() => {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        // Skip if this shortcut isn't for the current platform
        if (isMac && !shortcut.mac) return;
        if (!isMac && !shortcut.windows) return;
        
        // Check if the key matches (case-insensitive for letters)
        const keyMatches = e.key === shortcut.key || e.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!keyMatches) return;
        
        // Determine which modifier should be pressed
        const shouldHaveMeta = isMac && shortcut.mac;
        const shouldHaveCtrl = !isMac && shortcut.windows;
        
        // Check if modifier key is pressed correctly
        const hasCorrectModifier = (shouldHaveMeta && e.metaKey) || (shouldHaveCtrl && e.ctrlKey);
        if (!hasCorrectModifier) return;
        
        // Check shift key
        const shiftMatches = (shortcut.shift ? e.shiftKey : !e.shiftKey);
        if (!shiftMatches) return;
        
        // Check alt key
        const altMatches = (shortcut.alt ? e.altKey : !e.altKey);
        if (!altMatches) return;
        
        // All conditions matched - trigger the shortcut
        e.preventDefault();
        e.stopPropagation();
        shortcut.callback(e);
      });
    };
    
    // Add listener to both window and document in capture phase
    // This ensures shortcuts work even when form elements have focus
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [shortcuts]);
};
