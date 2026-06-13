"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useCustomerStore } from "@/stores/customer-store";
import { useDeliveryStore } from "@/stores/delivery-store";
import { usePaymentStore } from "@/stores/payment-store";
import { useExpenseStore } from "@/stores/expense-store";
import { useDairyStore } from "@/stores/dairy-store";
import { formatCurrency, roundTo2 } from "@/lib/accounting";
import { getMonthRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";

export function ReportsView() {
  const { dairy } = useDairyStore();
  const { customers, loadCustomers } = useCustomerStore();
  const { deliveries, loadDeliveries } = useDeliveryStore();
  const { payments, loadPayments } = usePaymentStore();
  const { expenses, loadExpenses } = useExpenseStore();
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!dairy) return;
    setLoading(true);
    const range = getMonthRange();
    try {
      await Promise.all([
        loadCustomers(dairy.id),
        loadDeliveries(dairy.id, range.start, range.end),
        loadPayments(dairy.id, range.start, range.end),
        loadExpenses(dairy.id, range.start, range.end),
      ]);
    } finally {
      setLoading(false);
    }
  }, [dairy, loadCustomers, loadDeliveries, loadPayments, loadExpenses]);

  useEffect(() => {
    loadData();
  }, [loadData, period]);

  const stats = useMemo(() => {
    const totalRevenue = roundTo2(deliveries.filter((d) => d.status === "delivered").reduce((s, d) => s + d.totalAmount, 0));
    const totalPayments = roundTo2(payments.reduce((s, p) => s + p.amount, 0));
    const totalExpenses = roundTo2(expenses.reduce((s, e) => s + e.amount, 0));
    const totalOutstanding = roundTo2(customers.reduce((s, c) => s + c.totalOutstanding, 0));
    const totalWalletBalance = roundTo2(customers.reduce((s, c) => s + c.walletBalance, 0));
    const netProfit = roundTo2(totalRevenue - totalExpenses);
    const activeCustomers = customers.filter((c) => c.isActive).length;
    const prepaidCustomers = customers.filter((c) => c.billingType === "prepaid").length;
    const postpaidCustomers = customers.filter((c) => c.billingType === "postpaid").length;

    // Milk type breakdown
    const cowDeliveries = deliveries.filter((d) => d.milkType === "cow" && d.status === "delivered");
    const buffaloDeliveries = deliveries.filter((d) => d.milkType === "buffalo" && d.status === "delivered");
    const mixedDeliveries = deliveries.filter((d) => d.milkType === "mixed" && d.status === "delivered");

    const cowQty = roundTo2(cowDeliveries.reduce((s, d) => s + d.quantity, 0));
    const buffaloQty = roundTo2(buffaloDeliveries.reduce((s, d) => s + d.quantity, 0));
    const mixedQty = roundTo2(mixedDeliveries.reduce((s, d) => s + d.quantity, 0));
    const totalQty = roundTo2(cowQty + buffaloQty + mixedQty);

    // Shift breakdown
    const morningDeliveries = deliveries.filter((d) => d.shift === "morning" && d.status === "delivered");
    const eveningDeliveries = deliveries.filter((d) => d.shift === "evening" && d.status === "delivered");
    const morningQty = roundTo2(morningDeliveries.reduce((s, d) => s + d.quantity, 0));
    const eveningQty = roundTo2(eveningDeliveries.reduce((s, d) => s + d.quantity, 0));

    // Expense by category
    const expenseByCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      expenseByCategory[e.category] = roundTo2((expenseByCategory[e.category] || 0) + e.amount);
    });

    // Top customers by delivery amount
    const customerDeliveryMap: Record<string, number> = {};
    deliveries.filter((d) => d.status === "delivered").forEach((d) => {
      customerDeliveryMap[d.customerId] = roundTo2((customerDeliveryMap[d.customerId] || 0) + d.totalAmount);
    });
    const topCustomers = Object.entries(customerDeliveryMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, amount]) => ({
        id,
        name: customers.find((c) => c.id === id)?.name || "Unknown",
        amount,
      }));

    return {
      totalRevenue,
      totalPayments,
      totalExpenses,
      totalOutstanding,
      totalWalletBalance,
      netProfit,
      activeCustomers,
      prepaidCustomers,
      postpaidCustomers,
      cowQty,
      buffaloQty,
      mixedQty,
      totalQty,
      morningQty,
      eveningQty,
      expenseByCategory,
      topCustomers,
    };
  }, [customers, deliveries, payments, expenses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reports</h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as "week" | "month" | "quarter")}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="milk" className="flex-1">Milk Breakdown</TabsTrigger>
          <TabsTrigger value="customers" className="flex-1">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Revenue & Profit */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs text-foreground/60">Revenue</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-foreground/60">Expenses</span>
                  </div>
                  <p className="text-lg font-bold text-amber-600">{formatCurrency(stats.totalExpenses)}</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {stats.netProfit >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-xs text-foreground/60">Net Profit</span>
                  </div>
                  <p className={`text-lg font-bold ${stats.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {formatCurrency(stats.netProfit)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-foreground/60">Outstanding</span>
                  </div>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Payments collected */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Payments Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalPayments)}</p>
              <p className="text-xs text-foreground/60 mt-1">Total payments received this period</p>
            </CardContent>
          </Card>

          {/* Expense breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(stats.expenseByCategory).map(([cat, amount]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{cat}</span>
                  <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
              {Object.keys(stats.expenseByCategory).length === 0 && (
                <p className="text-sm text-foreground/60">No expenses recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milk" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalQty} <span className="text-base font-normal text-foreground/60">litres</span></p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Badge variant="secondary" className="mb-1 bg-sky-100 text-sky-700">Cow</Badge>
                <p className="text-lg font-bold">{stats.cowQty}L</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Badge variant="secondary" className="mb-1 bg-amber-100 text-amber-700">Buffalo</Badge>
                <p className="text-lg font-bold">{stats.buffaloQty}L</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Badge variant="secondary" className="mb-1 bg-purple-100 text-purple-700">Mixed</Badge>
                <p className="text-lg font-bold">{stats.mixedQty}L</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Shift Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Morning</span>
                <span className="text-sm font-medium">{stats.morningQty}L</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Evening</span>
                <span className="text-sm font-medium">{stats.eveningQty}L</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{stats.activeCustomers}</p>
                <p className="text-xs text-foreground/60">Active Customers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{stats.prepaidCustomers + stats.postpaidCustomers}</p>
                <p className="text-xs text-foreground/60">Total Customers</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top Customers by Delivery Value</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.topCustomers.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm">{c.name}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(c.amount)}</span>
                </div>
              ))}
              {stats.topCustomers.length === 0 && (
                <p className="text-sm text-foreground/60">No delivery data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
