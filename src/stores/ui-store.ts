"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewType =
  | "dashboard"
  | "customers"
  | "customer-detail"
  | "deliveries"
  | "payments"
  | "expenses"
  | "milk-rates"
  | "inventory"
  | "reports"
  | "invoices"
  | "audit"
  | "settings"
  | "login"
  | "setup";

interface UIState {
  currentView: ViewType;
  selectedCustomerId: string | null;
  selectedDate: string; // YYYY-MM-DD
  selectedShift: "morning" | "evening";
  sidebarOpen: boolean;
  isOnline: boolean;
  syncPending: number;
  navigate: (view: ViewType, customerId?: string) => void;
  setSelectedDate: (date: string) => void;
  setSelectedShift: (shift: "morning" | "evening") => void;
  toggleSidebar: () => void;
  setOnlineStatus: (online: boolean) => void;
  setSyncPending: (count: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentView: "dashboard",
      selectedCustomerId: null,
      selectedDate: new Date().toISOString().split("T")[0],
      selectedShift: "morning",
      sidebarOpen: false,
      isOnline: true,
      syncPending: 0,

      navigate: (view, customerId) =>
        set({
          currentView: view,
          selectedCustomerId: customerId || null,
          sidebarOpen: false,
        }),

      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedShift: (shift) => set({ selectedShift: shift }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setOnlineStatus: (online) => set({ isOnline: online }),
      setSyncPending: (count) => set({ syncPending: count }),
    }),
    {
      name: "dairy-ledger-ui",
      partialize: (state) => ({
        currentView: state.currentView === "customer-detail" ? "customers" : state.currentView,
        selectedShift: state.selectedShift,
      }),
      // Always reset selectedDate to today on rehydration to avoid stale dates
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<UIState>),
        selectedDate: new Date().toISOString().split("T")[0],
      }),
    }
  )
);
