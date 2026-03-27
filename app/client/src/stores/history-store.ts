import { create } from "zustand";

export interface HistoryAction {
  type: string;
  payload: unknown;
  timestamp: number;
}

interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];
  push: (action: HistoryAction) => void;
  undo: () => HistoryAction | null;
  redo: () => HistoryAction | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

const MAX_HISTORY = 20;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  push: (action) =>
    set((state) => ({
      past: [...state.past, action].slice(-MAX_HISTORY),
      future: [],
    })),

  undo: () => {
    const { past } = get();
    if (past.length === 0) return null;
    const action = past[past.length - 1];
    set((state) => ({
      past: state.past.slice(0, -1),
      future: [action, ...state.future],
    }));
    return action;
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return null;
    const action = future[0];
    set((state) => ({
      past: [...state.past, action],
      future: state.future.slice(1),
    }));
    return action;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clear: () => set({ past: [], future: [] }),
}));
