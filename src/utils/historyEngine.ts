/**
 * History Engine - Manages undo/redo stacks for app state
 * 
 * This utility provides a simple, efficient history management system:
 * - Maintains separate undo/redo stacks
 * - Clears redo stack on new edits (standard undo/redo behavior)
 * - Enforces max history depth to control memory
 * - Distinguishes between tracked (user edits) and non-tracked (system updates) mutations
 */

export interface HistorySnapshot<T> {
  state: T;
  timestamp: number;
  description?: string;
}

export class HistoryEngine<T> {
  private undoStack: HistorySnapshot<T>[] = [];
  private redoStack: HistorySnapshot<T>[] = [];
  private maxDepth: number;

  constructor(maxDepth: number = 100) {
    this.maxDepth = maxDepth;
  }

  /**
   * Push current state onto undo stack (called when user makes a tracked change)
   * Automatically clears redo stack when new edit is made
   */
  push(state: T, description?: string): void {
    const snapshot: HistorySnapshot<T> = {
      state,
      timestamp: Date.now(),
      description,
    };

    this.undoStack.push(snapshot);

    // Clear redo stack - new edit invalidates forward history
    this.redoStack = [];

    // Enforce max depth by removing oldest entries if needed
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
  }

  /**
   * Get state from top of undo stack (undo operation)
   * Moves current state to redo stack
   */
  undo(currentState: T): T | null {
    if (!this.canUndo()) {
      return null;
    }

    // Move current state to redo stack
    this.redoStack.push({
      state: currentState,
      timestamp: Date.now(),
    });

    // Get previous state from undo stack
    const previousSnapshot = this.undoStack.pop();
    return previousSnapshot ? previousSnapshot.state : null;
  }

  /**
   * Get state from top of redo stack (redo operation)
   * Moves current state back to undo stack
   */
  redo(currentState: T): T | null {
    if (!this.canRedo()) {
      return null;
    }

    // Move current state back to undo stack
    this.undoStack.push({
      state: currentState,
      timestamp: Date.now(),
    });

    // Get next state from redo stack
    const nextSnapshot = this.redoStack.pop();
    return nextSnapshot ? nextSnapshot.state : null;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history (used when opening new plan, creating new plan, etc.)
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get undo stack depth (diagnostic)
   */
  getUndoDepth(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack depth (diagnostic)
   */
  getRedoDepth(): number {
    return this.redoStack.length;
  }
}

/**
 * Mutation wrapping type - helps ensure mutations go through tracked helper
 * 
 * Usage pattern:
 * ```
 * const trackedMutation = createTrackedMutation<BudgetData>(
 *   (prev) => {
 *     return { ...prev, someProp: newValue };
 *   },
 *   historyEngine,
 *   setBudgetData,
 *   "Updated pay settings" // optional description
 * );
 * trackedMutation();
 * ```
 */
export function createTrackedMutation<T>(
  updateFn: (prev: T) => T,
  historyEngine: HistoryEngine<T>,
  setState: (state: T | ((prev: T) => T)) => void,
  previousState: T,
  description?: string
): () => void {
  return () => {
    setState((prev) => {
      const newState = updateFn(prev);
      
      // Only push to history if state actually changed
      if (JSON.stringify(newState) !== JSON.stringify(previousState)) {
        historyEngine.push(previousState, description);
      }
      
      return newState;
    });
  };
}
