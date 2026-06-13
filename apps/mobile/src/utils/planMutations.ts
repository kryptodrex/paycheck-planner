/** Generic immutable helpers for editing plan item collections. */

export function upsertById<T extends { id: string }>(items: T[] | undefined, item: T): T[] {
  const list = items ?? [];
  const index = list.findIndex((existing) => existing.id === item.id);
  if (index === -1) return [...list, item];
  return list.map((existing) => (existing.id === item.id ? item : existing));
}

export function removeById<T extends { id: string }>(items: T[] | undefined, id: string): T[] {
  return (items ?? []).filter((item) => item.id !== id);
}

export function setEnabledById<T extends { id: string; enabled?: boolean }>(
  items: T[] | undefined,
  id: string,
  enabled: boolean,
): T[] {
  return (items ?? []).map((item) => (item.id === id ? { ...item, enabled } : item));
}

/** Parse a user-typed decimal amount. Returns null when not a valid non-negative number. */
export function parseAmount(value: string): number | null {
  const trimmed = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/** Format a stored number for editing in a text input. */
export function amountToInput(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '';
  return String(Math.round((value + Number.EPSILON) * 100) / 100);
}
