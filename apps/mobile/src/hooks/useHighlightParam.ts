import { useEffect, useState } from 'react';

/**
 * Tracks a transient "highlight this item" id passed via route params (e.g. from
 * search). Returns the id to highlight, auto-clearing after `durationMs` so the
 * emphasis fades on its own. The initial value is adopted during render (not in
 * an effect) to stay lint-clean; the effect only schedules the clear timer.
 */
export function useHighlightParam(param: string | undefined, durationMs = 2600): string | null {
  const [highlightId, setHighlightId] = useState<string | null>(param || null);
  const [appliedParam, setAppliedParam] = useState(param);

  if (param !== appliedParam) {
    setAppliedParam(param);
    setHighlightId(param || null);
  }

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), durationMs);
    return () => clearTimeout(timer);
  }, [highlightId, durationMs]);

  return highlightId;
}
