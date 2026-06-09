"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Expense {
  id: string;
  dairyId: string;
  category: "feed" | "fuel" | "salary" | "maintenance" | "transport" | "other";
  amount: number;
  description?: string;
  date: string;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  loadExpenses: (dairyId: string, dateFrom?: string, dateTo?: string) => Promise<void>;
  addExpense: (data: Omit<Expense, "id" | "synced" | "createdAt" | "updatedAt">) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set) => ({
      expenses: [],
      isLoading: false,
      error: null,

      loadExpenses: async (dairyId: string, dateFrom?: string, dateTo?: string) => {
        set({ isLoading: true });
        try {
          let url = `/api/expenses?dairyId=${dairyId}`;
          if (dateFrom) url += `&dateFrom=${dateFrom}`;
          if (dateTo) url += `&dateTo=${dateTo}`;
          const res = await fetch(url);
          const data = await res.json();
          if (res.ok) {
            set({ expenses: data.expenses || [], isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      addExpense: async (data) => {
        try {
          const res = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to add expense");
          set((state) => ({
            expenses: [...state.expenses, result.expense],
          }));
        } catch (error) {
          throw error;
        }
      },

      updateExpense: async (id, data) => {
        try {
          const res = await fetch("/api/expenses", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...data }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to update");
          set((state) => ({
            expenses: state.expenses.map((e) =>
              e.id === id ? { ...e, ...result.expense } : e
            ),
          }));
        } catch (error) {
          throw error;
        }
      },

      deleteExpense: async (id) => {
        try {
          const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete");
          set((state) => ({
            expenses: state.expenses.filter((e) => e.id !== id),
          }));
        } catch (error) {
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "dairy-ledger-expenses",
      partialize: (state) => ({ expenses: state.expenses }),
    }
  )
);
