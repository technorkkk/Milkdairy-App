"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Delivery {
  id: string;
  customerId: string;
  date: string;
  shift: "morning" | "evening";
  quantity: number;
  milkType: "cow" | "buffalo" | "mixed";
  pricePerL: number;
  totalAmount: number;
  status: "delivered" | "skipped" | "cancelled";
  notes?: string;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryState {
  deliveries: Delivery[];
  isLoading: boolean;
  error: string | null;
  loadDeliveries: (dairyId: string, dateFrom?: string, dateTo?: string) => Promise<void>;
  addDelivery: (data: Omit<Delivery, "id" | "totalAmount" | "synced" | "createdAt" | "updatedAt">) => Promise<Delivery>;
  bulkCreateDeliveries: (data: { customerId: string; startDate: string; absentDates: string[]; shift: "morning" | "evening" | "both"; milkType: string; pricePerL: number; defaultQuantity: number }) => Promise<number>;
  updateDelivery: (id: string, data: Partial<Delivery>) => Promise<void>;
  toggleDelivery: (customerId: string, date: string, shift: "morning" | "evening", defaultQty: number, milkType: string, pricePerL: number) => Promise<void>;
  deleteDelivery: (id: string) => Promise<void>;
  getDeliveriesByDate: (date: string, shift?: string) => Delivery[];
  getDeliveriesByCustomer: (customerId: string, dateFrom?: string, dateTo?: string) => Delivery[];
  clearError: () => void;
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set, get) => ({
      deliveries: [],
      isLoading: false,
      error: null,

      loadDeliveries: async (dairyId: string, dateFrom?: string, dateTo?: string) => {
        set({ isLoading: true });
        try {
          let url = `/api/deliveries?dairyId=${dairyId}`;
          if (dateFrom) url += `&dateFrom=${dateFrom}`;
          if (dateTo) url += `&dateTo=${dateTo}`;
          const res = await fetch(url);
          const data = await res.json();
          if (res.ok) {
            set({ deliveries: data.deliveries || [], isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      addDelivery: async (data) => {
        try {
          const totalAmount = Math.round((data.quantity * data.pricePerL + Number.EPSILON) * 100) / 100;
          const res = await fetch("/api/deliveries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, totalAmount }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to add delivery");
          const newDelivery = result.delivery as Delivery;
          set((state) => ({
            deliveries: [...state.deliveries, newDelivery],
          }));
          return newDelivery;
        } catch (error) {
          throw error;
        }
      },

      bulkCreateDeliveries: async (data) => {
        try {
          const res = await fetch("/api/deliveries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "bulk", ...data }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to create bulk deliveries");

          // Reload deliveries to get the full updated list
          const dairyId = data.customerId; // We'll reload via the customer's dairy
          // Instead of replacing, we just add the new deliveries
          const newDeliveries = result.deliveries as Delivery[];
          set((state) => ({
            deliveries: [...state.deliveries, ...newDeliveries],
          }));
          return result.count as number;
        } catch (error) {
          throw error;
        }
      },

      updateDelivery: async (id, data) => {
        try {
          const res = await fetch("/api/deliveries", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...data }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to update");
          set((state) => ({
            deliveries: state.deliveries.map((d) =>
              d.id === id ? { ...d, ...result.delivery } : d
            ),
          }));
        } catch (error) {
          throw error;
        }
      },

      toggleDelivery: async (customerId, date, shift, defaultQty, milkType, pricePerL) => {
        const existing = get().deliveries.find(
          (d) => d.customerId === customerId && d.date === date && d.shift === shift
        );

        if (existing) {
          if (existing.status === "delivered") {
            // Mark as skipped
            await get().updateDelivery(existing.id, { status: "skipped" });
          } else {
            // Mark as delivered
            await get().updateDelivery(existing.id, { status: "delivered", quantity: defaultQty });
          }
        } else {
          // Create new delivery
          await get().addDelivery({
            customerId,
            date,
            shift,
            quantity: defaultQty,
            milkType: milkType as "cow" | "buffalo" | "mixed",
            pricePerL,
            status: "delivered",
          });
        }
      },

      deleteDelivery: async (id) => {
        try {
          const res = await fetch(`/api/deliveries?id=${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete");
          set((state) => ({
            deliveries: state.deliveries.filter((d) => d.id !== id),
          }));
        } catch (error) {
          throw error;
        }
      },

      getDeliveriesByDate: (date, shift) => {
        return get().deliveries.filter(
          (d) => d.date === date && (!shift || d.shift === shift)
        );
      },

      getDeliveriesByCustomer: (customerId, dateFrom, dateTo) => {
        return get().deliveries.filter(
          (d) =>
            d.customerId === customerId &&
            (!dateFrom || d.date >= dateFrom) &&
            (!dateTo || d.date <= dateTo)
        );
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "dairy-ledger-deliveries",
      partialize: (state) => ({ deliveries: state.deliveries }),
    }
  )
);
