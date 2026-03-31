import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DataMode = "simulated" | "real" | "customer";

interface UIState {
  sidebarExpanded: boolean;
  theme: "dark" | "light";
  dataMode: DataMode;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setDataMode: (mode: DataMode) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarExpanded: true,
      theme: "dark",
      dataMode: "simulated",
      toggleSidebar: () =>
        set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setDataMode: (mode) => set({ dataMode: mode }),
    }),
    { name: "finiq-ui" }
  )
);
