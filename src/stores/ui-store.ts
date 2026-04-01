import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DataMode = "simulated" | "real";

interface UIState {
  sidebarExpanded: boolean;
  theme: "dark" | "light";
  dataMode: DataMode;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setDataMode: (mode: DataMode) => void;
}

// Default to "real" if NEXT_PUBLIC_DATA_MODE env var is set
const defaultDataMode: DataMode =
  (typeof process !== "undefined" && (process.env?.NEXT_PUBLIC_DATA_MODE === "real" || process.env?.DATA_MODE === "real")) ? "real" : "simulated";

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarExpanded: true,
      theme: "dark",
      dataMode: defaultDataMode,
      toggleSidebar: () =>
        set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setDataMode: (mode) => set({ dataMode: mode }),
    }),
    {
      name: "finiq-ui",
      // Override persisted dataMode with env var if set
      onRehydrateStorage: () => (state) => {
        const envMode = process.env.NEXT_PUBLIC_DATA_MODE;
        if (envMode === "real" && state) {
          state.setDataMode("real");
        }
      },
    }
  )
);
