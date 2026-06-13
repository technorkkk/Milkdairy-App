"use client";

import { useEffect, useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  AlertCircle,
  ArrowDownRight,
  Truck,
  ClipboardCheck,
  Banknote,
  UserPlus,
  Receipt,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomerStore } from "@/stores/customer-store";
import { useDeliveryStore } from "@/stores/delivery-store";
import { usePaymentStore } from "@/stores/payment-store";
import { useExpenseStore } from "@/stores/expense-store";
import { useDairyStore } from "@/stores/dairy-store";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency } from "@/lib/accounting";
import { getTodayStr, getMonthRange, MILK_TYPES, SHIFT_LABELS } from "@/lib/utils";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: "easeOut" as const,
    },
  }),
};

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.25 },
  },
};

const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

export function DashboardView() {
  const { customers, loadCustomers } = useCustomerStore();
  const { deliveries, loadDeliveries, getDeliveriesByDate } = useDeliveryStore();
  const { payments, loadPayments } = usePaymentStore();
  const { expenses, loadExpenses } = useExpenseStore();
  const { dairy } = useDairyStore();
  const navigate = useUIStore((s) => s.navigate);

  const dairyId = dairy?.id;

  useEffect(() => {
    if (!dairyId) return;
    const { start, end } = getMonthRange();
    loadCustomers(dairyId);
    loadDeliveries(dairyId, start, end);
    loadPayments(dairyId, start, end);
    loadExpenses(dairyId, start, end);
  }, [dairyId, loadCustomers, loadDeliveries, loadPayments, loadExpenses]);

  // ─── Computed values ───────────────────────────────────────────

  const { totalRevenue, totalOutstanding, totalExpenses, todayDeliveries } = useMemo(() => {
    const revenue = deliveries
      .filter((d) => d.status === "delivered")
      .reduce((sum, d) => sum + d.totalAmount, 0);

    const outstanding = customers.reduce(
      (sum, c) => sum + c.totalOutstanding,
      0
    );

    const exp = expenses.reduce((sum, e) => sum + e.amount, 0);

    const today = getTodayStr();
    const todayDel = getDeliveriesByDate(today).filter(
      (d) => d.status === "delivered"
    );

    return {
      totalRevenue: revenue,
      totalOutstanding: outstanding,
      totalExpenses: exp,
      todayDeliveries: todayDel,
    };
  }, [deliveries, customers, expenses, getDeliveriesByDate]);

  const recentDeliveries = useMemo(() => {
    return [...deliveries]
      .filter((d) => d.status === "delivered")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [deliveries]);

  const topOutstanding = useMemo(() => {
    return [...customers]
      .filter((c) => c.totalOutstanding > 0)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
      .slice(0, 5);
  }, [customers]);

  const getCustomerName = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? "Unknown";

  // ─── Quick actions ─────────────────────────────────────────────

  const quickActions = [
    {
      label: "Mark Deliveries",
      icon: ClipboardCheck,
      view: "deliveries" as const,
      color: "bg-emerald-600 text-white",
    },
    {
      label: "Add Payment",
      icon: Banknote,
      view: "payments" as const,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Add Customer",
      icon: UserPlus,
      view: "customers" as const,
      color: "bg-sky-100 text-sky-700",
    },
    {
      label: "Add Expense",
      icon: Receipt,
      view: "expenses" as const,
      color: "bg-rose-100 text-rose-700",
    },
  ];

  // ─── Summary cards ─────────────────────────────────────────────

  const summaryCards = [
    {
      title: "Monthly Revenue",
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      accent: "text-emerald-600",
      bgAccent: "bg-emerald-50",
    },
    {
      title: "Outstanding",
      value: formatCurrency(totalOutstanding),
      icon: AlertCircle,
      accent: totalOutstanding > 0 ? "text-amber-600" : "text-emerald-600",
      bgAccent: totalOutstanding > 0 ? "bg-amber-50" : "bg-emerald-50",
    },
    {
      title: "Expenses",
      value: formatCurrency(totalExpenses),
      icon: ArrowDownRight,
      accent: "text-rose-600",
      bgAccent: "bg-rose-50",
    },
    {
      title: "Today's Deliveries",
      value: `${todayDeliveries.length}`,
      icon: Truck,
      accent: "text-sky-600",
      bgAccent: "bg-sky-50",
    },
  ];

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="px-4 py-4 space-y-6 max-w-lg mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="py-0 gap-0 overflow-hidden">
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground leading-tight">
                      {card.title}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.bgAccent}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${card.accent}`} />
                    </div>
                  </div>
                  <p
                    className={`text-lg font-bold leading-tight ${card.accent}`}
                  >
                    {card.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="ghost"
                className={cn(
                  "flex flex-col items-center gap-1.5 h-auto py-3 px-1",
                  idx === 0 && "ring-2 ring-emerald-200"
                )}
                onClick={() => navigate(action.view)}
              >
                <div
                  className={cn("w-11 h-11 rounded-xl flex items-center justify-center", action.color)}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold leading-tight text-center">
                  {action.label}
                </span>
              </Button>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Deliveries */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <Card className="py-0 gap-0 border-border/80">
          <CardHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Recent Deliveries
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-700 font-semibold h-7 px-3 hover:bg-emerald-50"
                onClick={() => navigate("deliveries")}
              >
                View All →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {recentDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No deliveries yet. Start by marking deliveries.
              </p>
            ) : (
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {recentDeliveries.map((d) => (
                  <motion.li
                    key={d.id}
                    variants={listItemVariants}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getCustomerName(d.customerId)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {d.date} &middot; {SHIFT_LABELS[d.shift] ?? d.shift}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {MILK_TYPES[d.milkType] ?? d.milkType}
                      </Badge>
                      <span className="text-sm font-semibold text-emerald-700">
                        {formatCurrency(d.totalAmount)}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Outstanding Customers */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <Card className="py-0 gap-0">
          <CardHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Top Outstanding
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-700 font-semibold h-7 px-3 hover:bg-emerald-50"
                onClick={() => navigate("customers")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {topOutstanding.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No outstanding balances
              </p>
            ) : (
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {topOutstanding.map((c) => (
                  <motion.li
                    key={c.id}
                    variants={listItemVariants}
                    className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 -mx-1 px-1 rounded-md transition-colors"
                    onClick={() => navigate("customer-detail", c.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {MILK_TYPES[c.milkType] ?? c.milkType} &middot;{" "}
                          {c.billingType === "prepaid"
                            ? "Prepaid"
                            : "Postpaid"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-600 shrink-0">
                      {formatCurrency(c.totalOutstanding)}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
