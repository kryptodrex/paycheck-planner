import { VIEW_MODES } from '../constants/frequencies';

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];

export type SelectableViewMode = Exclude<ViewMode, 'paycheck'>;