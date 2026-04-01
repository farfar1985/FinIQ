/**
 * Undo/Redo State Manager — FR8.11
 *
 * Generic undo/redo system for tracking state history.
 * Used by the Data Explorer to track query state (table, columns, filters).
 */

export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

/** Create an initial undo/redo state from a starting value */
export function createUndoRedoState<T>(initial: T): UndoRedoState<T> {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

/** Push a new state, moving current to past and clearing future */
export function pushState<T>(state: UndoRedoState<T>, newPresent: T): UndoRedoState<T> {
  return {
    past: [...state.past, state.present],
    present: newPresent,
    future: [],
  };
}

/** Undo: move present to future, restore last past state */
export function undo<T>(state: UndoRedoState<T>): UndoRedoState<T> {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  const newPast = state.past.slice(0, -1);
  return {
    past: newPast,
    present: previous,
    future: [state.present, ...state.future],
  };
}

/** Redo: move first future state to present, push present to past */
export function redo<T>(state: UndoRedoState<T>): UndoRedoState<T> {
  if (state.future.length === 0) return state;
  const next = state.future[0];
  const newFuture = state.future.slice(1);
  return {
    past: [...state.past, state.present],
    present: next,
    future: newFuture,
  };
}

/** Check if undo is possible */
export function canUndo<T>(state: UndoRedoState<T>): boolean {
  return state.past.length > 0;
}

/** Check if redo is possible */
export function canRedo<T>(state: UndoRedoState<T>): boolean {
  return state.future.length > 0;
}
