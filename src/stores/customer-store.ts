"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { reconcileAccount, roundTo2 } from "@/lib/accounting";

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  billingType: "prepaid" | "postpaid";
  milkType: "cow" | "buffalo" | "mixed";
  defaultQuantity: number;
  shift: "morning" | "evening" | "both";
  walletBalance: number;
  totalOutstanding: number;
  openingBalance: number;
  isActive: boolean;
  startDate?: string; // Customer's actual service start date (YYYY-MM-DD), used for billing cycle
  dairyId: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  loadCustomers: (dairyId: string) => Promise<void>;
  addCustomer: (data: Omit<Customer, "id" | "walletBalance" | "totalOutstanding" | "createdAt" | "updatedAt"> & { startDate?: string }) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  recalculateBalances: (customerId: string, deliveries: Array<{ quantity: number; pricePerL: number }>, payments: Array<{ amount: number }>) => void;
  getCustomerById: (id: string) => Customer | undefined;
  clearError: () => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: [],
      isLoading: false,
      error: null,

      loadCustomers: async (dairyId: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/customers?dairyId=${dairyId}`);
          const data = await res.json();
          if (res.ok) {
            set({ customers: data.customers || [], isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      addCustomer: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to add customer");
          const newCustomer = result.customer as Customer;
          set((state) => ({
            customers: [...state.customers, newCustomer],
            isLoading: false,
          }));
          return newCustomer;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed", isLoading: false });
          throw error;
        }
      },

      updateCustomer: async (id, data) => {
        try {
          const res = await fetch("/api/customers", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...data }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to update");
          set((state) => ({
            customers: state.customers.map((c) =>
              c.id === id ? { ...c, ...result.customer } : c
            ),
          }));
        } catch (error) {
          throw error;
        }
      },

      deleteCustomer: async (id) => {
        try {
          const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete");
          set((state) => ({
            customers: state.customers.filter((c) => c.id !== id),
          }));
        } catch (error) {
          throw error;
        }
      },

      recalculateBalances: (customerId, deliveries, payments) => {
        const customer = get().customers.find((c) => c.id === customerId);
        if (!customer) return;

        const result = reconcileAccount(
          customer.billingType,
          customer.openingBalance,
          deliveries,
          payments
        );

        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === customerId
              ? {
                  ...c,
                  walletBalance: roundTo2(result.walletBalance),
                  totalOutstanding: roundTo2(result.totalOutstanding),
                }
              : c
          ),
        }));
      },

      getCustomerById: (id) => {
        return get().customers.find((c) => c.id === id);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "dairy-ledger-customers",
      partialize: (state) => ({ customers: state.customers }),
    }
  )
);
