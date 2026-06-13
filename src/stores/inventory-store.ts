"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MilkRate {
  id: string;
  milkType: "cow" | "buffalo" | "mixed";
  pricePerL: number;
  shift: "morning" | "evening" | "both";
  effectiveFrom: string;
  dairyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: "milk" | "feed" | "supply" | "equipment" | "other";
  quantity: number;
  unit: "litre" | "kg" | "piece" | "packet";
  minStock: number;
  pricePerUnit: number;
  lastRestocked: string | null;
  dairyId: string;
  createdAt: string;
  updatedAt: string;
}

interface InventoryState {
  milkRates: MilkRate[];
  inventoryItems: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  loadMilkRates: (dairyId: string) => Promise<void>;
  addMilkRate: (data: Omit<MilkRate, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateMilkRate: (id: string, data: Partial<MilkRate>) => Promise<void>;
  deleteMilkRate: (id: string) => Promise<void>;
  getCurrentRate: (milkType: string, shift?: string) => MilkRate | undefined;
  loadInventory: (dairyId: string) => Promise<void>;
  addInventoryItem: (data: Omit<InventoryItem, "id" | "createdAt" | "updatedAt" | "lastRestocked">) => Promise<void>;
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      milkRates: [],
      inventoryItems: [],
      isLoading: false,
      error: null,

      loadMilkRates: async (dairyId: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/milk-rates?dairyId=${dairyId}`);
          const data = await res.json();
          if (res.ok) {
            set({ milkRates: data.rates || [], isLoading: false, error: null });
          } else {
            set({ isLoading: false, error: data.error || "Failed to load milk rates" });
          }
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to load milk rates" });
        }
      },

      addMilkRate: async (data) => {
        try {
          const res = await fetch("/api/milk-rates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to add rate");
          set((state) => ({
            milkRates: [...state.milkRates, result.rate],
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to add milk rate" });
          throw error;
        }
      },

      updateMilkRate: async (id, data) => {
        try {
          const res = await fetch("/api/milk-rates", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...data }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to update");
          set((state) => ({
            milkRates: state.milkRates.map((r) =>
              r.id === id ? { ...r, ...result.rate } : r
            ),
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to update milk rate" });
          throw error;
        }
      },

      deleteMilkRate: async (id) => {
        try {
          const res = await fetch(`/api/milk-rates?id=${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete");
          set((state) => ({
            milkRates: state.milkRates.filter((r) => r.id !== id),
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to delete milk rate" });
          throw error;
        }
      },

      getCurrentRate: (milkType, shift) => {
        const rates = get().milkRates
          .filter((r) => r.milkType === milkType)
          .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
        
        if (!shift) return rates[0];
        
        // Find exact match first
        const exact = rates.find((r) => r.shift === shift || r.shift === "both");
        return exact || rates.find((r) => r.shift === "both") || rates[0];
      },

      loadInventory: async (dairyId: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/inventory?dairyId=${dairyId}`);
          const data = await res.json();
          if (res.ok) {
            // API returns array directly or wrapped in { items: [...] }
            const itemsList = Array.isArray(data) ? data : (data.items || []);
            set({ inventoryItems: itemsList, isLoading: false, error: null });
          } else {
            set({ isLoading: false, error: data.error || "Failed to load inventory" });
          }
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to load inventory" });
        }
      },

      addInventoryItem: async (data) => {
        try {
          const res = await fetch("/api/inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to add item");
          // API returns item directly (spread), not wrapped in { item: ... }
          const newItem = result.item || result;
          set((state) => ({
            inventoryItems: [...state.inventoryItems, newItem],
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to add inventory item" });
          throw error;
        }
      },

      updateInventoryItem: async (id, data) => {
        try {
          const res = await fetch("/api/inventory", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...data }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to update");
          const updatedItem = result.item || result;
          set((state) => ({
            inventoryItems: state.inventoryItems.map((i) =>
              i.id === id ? { ...i, ...updatedItem } : i
            ),
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to update inventory item" });
          throw error;
        }
      },

      deleteInventoryItem: async (id) => {
        try {
          const res = await fetch(`/api/inventory?id=${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete");
          set((state) => ({
            inventoryItems: state.inventoryItems.filter((i) => i.id !== id),
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to delete inventory item" });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "dairy-ledger-inventory",
      partialize: (state) => ({
        milkRates: state.milkRates,
        inventoryItems: state.inventoryItems,
      }),
    }
  )
);
