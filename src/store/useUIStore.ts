import { create } from "zustand";

interface UIState {
  theme: "light" | "dark" | "system";
  isSidebarOpen: boolean;
  activeModalId: string | null;
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

/**
 * Ultra-lightweight global UI state store.
 * Zero provider boilerplate, selective subscriptions only.
 */
export const useUIStore = create<UIState>((set) => ({
  theme: "system",
  isSidebarOpen: false,
  activeModalId: null,
  
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  openModal: (id) => set({ activeModalId: id }),
  closeModal: () => set({ activeModalId: null }),
}));
