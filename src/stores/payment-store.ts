"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Payment {
  id: string;
  customerId: string;
  amount: number;
  paymentMode: "cash" | "upi" | "bank" | "other";
  date: string;
  notes?: string;
  receiptNo?: string;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaymentState {
  payments: Payment[];
  isLoading: boolean;
  error: string | null;
  loadPayments: (dairyId: string, dateFrom?: string, dateTo?: string) => Promise<void>;
  addPayment: (data: Omit<Payment, "id" | "synced" | "createdAt" | "updatedAt">) => Promise<Payment>;
  updatePayment: (id: string, data: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  getPaymentsByCustomer: (customerId: string) => Payment[];
  clearError: () => void;
}

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set, get) => ({
      payments: [],
      isLoading: false,
      error: null,

      loadPayments: async (dairyId: string, dateFrom?: string, dateTo?: string) => {
        set({ isLoading: true });
        try {
          let url = `/api/payments?dairyId=${dairyId}`;
          if (dateFrom) url += `&dateFrom=${dateFrom}`;
          if (dateTo) url += `&dateTo=${dateTo}`;
          const res = await fetch(url);
          const data = await res.json();
          if (res.ok) {
            // API returns array directly or wrapped in { payments: [...] }
            const paymentsList = Array.isArray(data) ? data : (data.payments || []);
            set({ payments: paymentsList, isLoading: false, error: null });
          } else {
            set({ isLoading: false, error: data.error || "Failed to load payments" });
          }
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to load payments" });
        }
      },

      addPayment: async (data) => {
        try {
          const res = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to add payment");
          // API returns payment directly (spread), not wrapped in { payment: ... }
          const newPayment = (result.payment || result) as Payment;
          set((state) => ({
            payments: [...state.payments, newPayment],
          }));
          return newPayment;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to add payment" });
          throw error;
        }
      },

      updatePayment: async (id, data) => {
        try {
          const res = await fetch("/api/payments", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...data }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to update");
          const updatedPayment = result.payment || result;
          set((state) => ({
            payments: state.payments.map((p) =>
              p.id === id ? { ...p, ...updatedPayment } : p
            ),
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to update payment" });
          throw error;
        }
      },

      deletePayment: async (id) => {
        try {
          const res = await fetch(`/api/payments?id=${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete");
          set((state) => ({
            payments: state.payments.filter((p) => p.id !== id),
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to delete payment" });
          throw error;
        }
      },

      getPaymentsByCustomer: (customerId) => {
        return get().payments.filter((p) => p.customerId === customerId);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "dairy-ledger-payments",
      partialize: (state) => ({ payments: state.payments }),
    }
  )
);
