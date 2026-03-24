import React from 'react';
import type { SelectableViewMode } from '../../../types/viewMode';
import { CheckboxGroup, InfoBox, Modal } from '../../_shared';
import { MAX_VISIBLE_FAVORITE_VIEW_MODES, SELECTABLE_VIEW_MODES, sanitizeFavoriteViewModes } from '../../../utils/viewModePreferences';
import './ViewModeSettingsModal.css';

const VIEW_MODE_OPTIONS = SELECTABLE_VIEW_MODES.map((mode) => {
  let label = mode.charAt(0).toUpperCase() + mode.slice(1);
  if (mode === 'bi-weekly') label = 'Bi-weekly';
  if (mode === 'semi-monthly') label = 'Semi-monthly';
  return { value: mode, label };
});

interface ViewModeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: SelectableViewMode[];
  onChange: (favorites: SelectableViewMode[]) => void;
}

const ViewModeSettingsModal: React.FC<ViewModeSettingsModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onChange,
}) => {
  const handleChange = (values: string[]) => {
    const next = sanitizeFavoriteViewModes(values).slice(0, MAX_VISIBLE_FAVORITE_VIEW_MODES) as SelectableViewMode[];
    onChange(next);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="view-mode-settings-modal-content"
      header="View Mode Favorites"
    >
      <div className="view-mode-settings-modal-body">
        <div className="settings-group">
          <label>Always show these view modes:</label>
          <CheckboxGroup
            selectedValues={favorites}
            onChange={handleChange}
            className="settings-view-mode-grid"
            options={VIEW_MODE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              disabled:
                (favorites.length === 1 && favorites.includes(option.value)) 
                || (favorites.length >= MAX_VISIBLE_FAVORITE_VIEW_MODES && !favorites.includes(option.value)),
            }))}
          />
        </div>

        <InfoBox>
          Selected favorites apply to this plan only. You can pin up to {MAX_VISIBLE_FAVORITE_VIEW_MODES} view modes, and a minimum of 1 must stay enabled.
        </InfoBox>
      </div>
    </Modal>
  );
};

export default ViewModeSettingsModal;
