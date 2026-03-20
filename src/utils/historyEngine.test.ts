import { describe, it, expect } from 'vitest';
import { HistoryEngine } from './historyEngine';

describe('HistoryEngine', () => {
  const createTestState = (value: number) => ({ count: value });

  it('should track state changes in undo stack', () => {
    const engine = new HistoryEngine<{ count: number }>(100);
    
    engine.push(createTestState(1));
    engine.push(createTestState(2));
    
    expect(engine.getUndoDepth()).toBe(2);
    expect(engine.canUndo()).toBe(true);
  });

  it('should undo to previous state', () => {
    const engine = new HistoryEngine<{ count: number }>(100);
    const state1 = createTestState(1);
    const state2 = createTestState(2);

    engine.push(state1);
    engine.push(state2);

    const undoneTo = engine.undo(createTestState(3));
    
    expect(undoneTo).toEqual(state2);
    expect(engine.canRedo()).toBe(true);
  });

  it('should redo to next state', () => {
    const engine = new HistoryEngine<{ count: number }>(100);
    const state1 = createTestState(1);
    const state2 = createTestState(2);
    const state3 = createTestState(3);

    engine.push(state1);
    engine.push(state2);
    engine.undo(state3);

    const redoneTo = engine.redo(state3);
    
    expect(redoneTo).toEqual(state3);
    expect(engine.canRedo()).toBe(false);
  });

  it('should not undo when stack is empty', () => {
    const engine = new HistoryEngine<{ count: number }>(100);
    
    expect(engine.canUndo()).toBe(false);
    const result = engine.undo(createTestState(1));
    expect(result).toBeNull();
  });

  it('should not redo when stack is empty', () => {
    const engine = new HistoryEngine<{ count: number }>(100);
    
    expect(engine.canRedo()).toBe(false);
    const result = engine.redo(createTestState(1));
    expect(result).toBeNull();
  });

  it('should clear redo stack on new push', () => {
    const engine = new HistoryEngine<{ count: number }>(100);
    const state1 = createTestState(1);
    const state2 = createTestState(2);
    const state3 = createTestState(3);
    const state4 = createTestState(4);

    engine.push(state1);
    engine.push(state2);
    engine.undo(state3);

    expect(engine.canRedo()).toBe(true);

    // New push should clear redo
    engine.push(state4);

    expect(engine.canRedo()).toBe(false);
    expect(engine.getUndoDepth()).toBe(2);
  });

  it('should enforce max depth', () => {
    const engine = new HistoryEngine<{ count: number }>(3);

    for (let i = 1; i <= 5; i++) {
      engine.push(createTestState(i));
    }

    // Should only have 3 entries (max depth)
    expect(engine.getUndoDepth()).toBe(3);
  });

  it('should clear all history', () => {
    const engine = new HistoryEngine<{ count: number }>(100);

    engine.push(createTestState(1));
    engine.push(createTestState(2));

    engine.clear();

    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(false);
  });

  it('should support optional descriptions', () => {
    const engine = new HistoryEngine<{ count: number }>(100);

    engine.push(createTestState(1), 'Increased count');

    const result = engine.undo(createTestState(2));
    expect(result).toEqual(createTestState(1));
  });

  it('should handle multiple undo/redo cycles', () => {
    const engine = new HistoryEngine<{ count: number }>(100);
    const state1 = createTestState(1);
    const state2 = createTestState(2);
    const state3 = createTestState(3);
    const state4 = createTestState(4);

    engine.push(state1);
    engine.push(state2);
    engine.push(state3);

    // Undo twice
    engine.undo(state4);
    engine.undo(state3);

    expect(engine.canUndo()).toBe(true);
    expect(engine.canRedo()).toBe(true);

    // Redo once
    const redoState = engine.redo(state2);
    expect(redoState).toEqual(state3);
    expect(engine.canRedo()).toBe(true);
  });
});
