/**
 * Reallocation source type metadata.
 *
 * Single source of truth for every reallocation proposal source type.
 * Adding a new type requires only one entry here — the union type, section order,
 * pause-only classification, and candidate grouping all derive from this array.
 */

export const REALLOCATION_SOURCE_TYPE_METADATA = [
  { id: 'bill', label: 'Bills', isPauseOnly: true },
  { id: 'deduction', label: 'Deductions', isPauseOnly: true },
  { id: 'custom-allocation', label: 'Custom Allocations', isPauseOnly: false },
  { id: 'savings', label: 'Savings', isPauseOnly: false },
  { id: 'investment', label: 'Investments', isPauseOnly: false },
  { id: 'retirement', label: 'Retirement', isPauseOnly: false },
] as const;

export type ReallocationSourceTypeMetadata = (typeof REALLOCATION_SOURCE_TYPE_METADATA)[number];

/** Union type derived from the metadata — add a new entry above to extend this. */
export type ReallocationProposalSourceType = ReallocationSourceTypeMetadata['id'];

/** Section display order for ReallocationReviewModal — same as metadata array order. */
export const REALLOCATION_SECTION_ORDER = REALLOCATION_SOURCE_TYPE_METADATA;

/** Set of source types where only pausing is allowed (no amount reduction). */
export const REALLOCATION_PAUSE_ONLY_TYPES = new Set(
  REALLOCATION_SOURCE_TYPE_METADATA.filter((m) => m.isPauseOnly).map((m) => m.id),
) as ReadonlySet<ReallocationProposalSourceType>;

/** Set of source types where amount reduction is allowed. */
export const REALLOCATION_ADJUSTABLE_TYPES = new Set(
  REALLOCATION_SOURCE_TYPE_METADATA.filter((m) => !m.isPauseOnly).map((m) => m.id),
) as ReadonlySet<ReallocationProposalSourceType>;

/** Ordered list of source type IDs for candidate grouping in the planner. */
export const REALLOCATION_SOURCE_TYPE_ORDER = REALLOCATION_SOURCE_TYPE_METADATA.map((m) => m.id);
