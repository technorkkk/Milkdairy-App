"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SyncQueueItem, createSyncQueueItem, SyncOperation } from "@/lib/sync";

interface SyncStoreState {
  queue: SyncQueueItem[];
  isSyncing: boolean;
  lastSyncAt: string | null;
  errors: string[];
  addToQueue: (operation: SyncOperation, entity: string, entityId: string, payload: Record<string, unknown>) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, updates: Partial<SyncQueueItem>) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncAt: (date: string) => void;
  addError: (error: string) => void;
  clearErrors: () => void;
  getPendingCount: () => number;
}

export const useSyncStore = create<SyncStoreState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,
      lastSyncAt: null,
      errors: [],

      addToQueue: (operation, entity, entityId, payload) => {
        const item = createSyncQueueItem(operation, entity, entityId, payload);
        set((state) => ({ queue: [...state.queue, item] }));
      },

      removeFromQueue: (id) => {
        set((state) => ({ queue: state.queue.filter((item) => item.id !== id) }));
      },

      updateQueueItem: (id, updates) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      clearCompleted: () => {
        set((state) => ({
          queue: state.queue.filter((item) => item.status !== "completed"),
        }));
      },

      clearAll: () => set({ queue: [] }),

      setSyncing: (syncing) => set({ isSyncing: syncing }),
      setLastSyncAt: (date) => set({ lastSyncAt: date }),
      addError: (error) => set((state) => ({ errors: [...state.errors.slice(-9), error] })),
      clearErrors: () => set({ errors: [] }),

      getPendingCount: () => {
        return get().queue.filter((item) => item.status === "pending" || item.status === "failed").length;
      },
    }),
    {
      name: "dairy-ledger-sync",
      partialize: (state) => ({
        queue: state.queue,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
