export type ViewMode =
	| 'paycheck' // legacy alias for pay-cadence-based amounts
	| 'weekly'
	| 'bi-weekly'
	| 'semi-monthly'
	| 'monthly'
	| 'quarterly'
	| 'yearly';

export type SelectableViewMode = Exclude<ViewMode, 'paycheck'>;