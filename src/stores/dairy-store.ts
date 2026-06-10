"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Dairy {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  ownerName: string;
  userId: string;
  createdAt: string;
}

interface DairyState {
  dairy: Dairy | null;
  isSetup: boolean;
  isLoading: boolean;
  error: string | null;
  loadDairy: (userId: string) => Promise<void>;
  setupDairy: (data: { name: string; address?: string; phone?: string; ownerName: string; userId: string }) => Promise<void>;
  updateDairy: (data: Partial<Dairy>) => Promise<void>;
  clearError: () => void;
}

export const useDairyStore = create<DairyState>()(
  persist(
    (set) => ({
      dairy: null,
      isSetup: false,
      isLoading: false,
      error: null,

      loadDairy: async (userId: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/dairy?userId=${userId}`);
          const data = await res.json();
          if (res.ok && data.dairy) {
            set({ dairy: data.dairy, isSetup: true, isLoading: false, error: null });
          } else {
            set({ isSetup: false, isLoading: false, error: data.error || "Failed to load dairy" });
          }
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to load dairy" });
        }
      },

      setupDairy: async (data) => {
        set({ isLoading: true });
        try {
          const res = await fetch("/api/dairy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Setup failed");
          set({ dairy: result.dairy, isSetup: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to setup dairy" });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      updateDairy: async (data) => {
        try {
          const res = await fetch("/api/dairy", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Update failed");
          set({ dairy: result.dairy });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to update dairy" });
          throw error;
        }
      },
    }),
    {
      name: "dairy-ledger-dairy",
      partialize: (state) => ({
        dairy: state.dairy,
        isSetup: state.isSetup,
      }),
    }
  )
);
