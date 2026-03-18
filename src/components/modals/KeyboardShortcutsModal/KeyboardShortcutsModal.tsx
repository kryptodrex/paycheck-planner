import React from 'react';
import { Button, Modal } from '../../_shared';
import './KeyboardShortcutsModal.css';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  items: ShortcutItem[];
}

const isMac = navigator.platform.toUpperCase().includes('MAC');

const modifier = isMac ? 'Cmd' : 'Ctrl';
const shortcuts: ShortcutSection[] = [
  {
    title: 'Plan Navigation',
    items: [
      { keys: [isMac ? 'Cmd' : 'Alt', isMac ? '[' : 'Left'], description: 'Go back to the previous page in the current plan session' },
      { keys: [isMac ? 'Cmd' : 'Alt', isMac ? ']' : 'Right'], description: 'Go forward after going back' },
      { keys: [modifier, 'Shift', 'H'], description: 'Go to the first visible tab in the current tab bar' },
      { keys: [modifier, '1-6'], description: 'Jump to a visible tab by its current order in the tab bar' },
    ],
  },
  {
    title: 'Plan Actions',
    items: [
      { keys: [modifier, ','], description: 'Open Settings' },
      { keys: [modifier, 'S'], description: 'Save the current plan' },
      { keys: [modifier, 'O'], description: 'Open an existing plan' },
      { keys: [modifier, 'Shift', 'N'], description: 'Create a new plan' },
      { keys: [modifier, 'N'], description: 'Open a new window' },
      { keys: [modifier, 'W'], description: 'Close the current window' },
    ],
  },
  {
    title: 'Views Options',
    items: [
      { keys: [modifier, 'Shift', 'A'], description: 'Open Accounts' },
      { keys: [modifier, 'Shift', 'P'], description: 'Open Pay Options' },
      { keys: [modifier, 'Shift', 'T'], description: 'Move tab bar to the top' },
      { keys: [modifier, 'Shift', 'B'], description: 'Move tab bar to the bottom' },
      { keys: [modifier, 'Shift', 'L'], description: 'Move tab bar to the left' },
      { keys: [modifier, 'Shift', 'R'], description: 'Move tab bar to the right' },
      { keys: [modifier, 'Shift', 'D'], description: 'Toggle tab display mode between compact and expanded (left/right tab bar only)' },
      { keys: [modifier, '+'], description: 'Zoom in (scales the full app viewport)' },
      { keys: [modifier, '-'], description: 'Zoom out (scales the full app viewport)' },
      { keys: [modifier, '0'], description: 'Reset zoom to 100%' },
    ],
  },
  {
    title: 'Help And Dialogs',
    items: [
      { keys: [modifier, 'Shift', '/'], description: 'Open the glossary' },
      { keys: ['Esc'], description: 'Close the active modal or dialog' },
    ],
  },
];

const renderShortcutKeys = (keys: string[]) => (
  <span className="keyboard-shortcuts-keys" aria-label={keys.join(' plus ')}>
    {keys.map((key) => (
      <kbd key={key} className="keyboard-shortcuts-key">
        {key}
      </kbd>
    ))}
  </span>
);

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header="Keyboard Shortcuts"
      contentClassName="keyboard-shortcuts-modal"
      footer={
        <div className="keyboard-shortcuts-footer">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="keyboard-shortcuts-intro">
        <p>
          These shortcuts work within the current app session. Back and Forward navigate your in-session plan history, and Home jumps to the first visible tab in your current tab order.
        </p>
        <p>
          Zoom changes the entire app viewport. Font Scale in Settings adjusts text sizing for readability preferences.
        </p>
      </div>

      <div className="keyboard-shortcuts-sections">
        {shortcuts.map((section) => (
          <section key={section.title} className="keyboard-shortcuts-section">
            <h3>{section.title}</h3>
            <div className="keyboard-shortcuts-list">
              {section.items.map((item) => (
                <div key={`${section.title}-${item.description}`} className="keyboard-shortcuts-item">
                  <div className="keyboard-shortcuts-item-keys">{renderShortcutKeys(item.keys)}</div>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsModal;