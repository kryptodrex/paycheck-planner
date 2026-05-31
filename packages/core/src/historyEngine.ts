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

  private batchMode: boolean = false;
  private batchPreState: T | undefined = undefined;

  beginBatch(): void {
    if (!this.batchMode) {
      this.batchMode = true;
      this.batchPreState = undefined;
    }
  }

  commitBatch(description?: string): void {
    const preState = this.batchPreState;
    this.batchMode = false;
    this.batchPreState = undefined;

    if (preState !== undefined) {
      const snapshot: HistorySnapshot<T> = {
        state: preState,
        timestamp: Date.now(),
        description,
      };
      this.undoStack.push(snapshot);
      this.redoStack = [];
      if (this.undoStack.length > this.maxDepth) {
        this.undoStack.shift();
      }
    }
  }

  discardBatch(): void {
    this.batchMode = false;
    this.batchPreState = undefined;
  }

  push(state: T, description?: string): void {
    if (this.batchMode) {
      if (this.batchPreState === undefined) {
        this.batchPreState = state;
      }
      return;
    }

    const snapshot: HistorySnapshot<T> = {
      state,
      timestamp: Date.now(),
      description,
    };

    this.undoStack.push(snapshot);
    this.redoStack = [];

    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
  }

  undo(currentState: T): T | null {
    if (!this.canUndo()) {
      return null;
    }

    this.redoStack.push({
      state: currentState,
      timestamp: Date.now(),
    });

    const previousSnapshot = this.undoStack.pop();
    return previousSnapshot ? previousSnapshot.state : null;
  }

  redo(currentState: T): T | null {
    if (!this.canRedo()) {
      return null;
    }

    this.undoStack.push({
      state: currentState,
      timestamp: Date.now(),
    });

    const nextSnapshot = this.redoStack.pop();
    return nextSnapshot ? nextSnapshot.state : null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoDepth(): number {
    return this.undoStack.length;
  }

  getRedoDepth(): number {
    return this.redoStack.length;
  }
}

export function createTrackedMutation<T>(
  updateFn: (prev: T) => T,
  historyEngine: HistoryEngine<T>,
  setState: (state: T | ((prev: T) => T)) => void,
  previousState: T,
  description?: string,
): () => void {
  return () => {
    setState((prev) => {
      const newState = updateFn(prev);

      if (JSON.stringify(newState) !== JSON.stringify(previousState)) {
        historyEngine.push(previousState, description);
      }

      return newState;
    });
  };
}
