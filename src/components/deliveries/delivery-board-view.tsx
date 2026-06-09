"use client";

import { useEffect, useMemo, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomerStore, type Customer } from "@/stores/customer-store";
import { useDeliveryStore, type Delivery } from "@/stores/delivery-store";
import { useInventoryStore } from "@/stores/inventory-store";
import { useDairyStore } from "@/stores/dairy-store";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency } from "@/lib/accounting";
import {
  formatDate,
  MILK_TYPES,
  SHIFT_LABELS,
} from "@/lib/utils";
import { addDays, parseISO, format } from "date-fns";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.25, ease: "easeOut" as const },
  }),
};

export function DeliveryBoardView() {
  const { customers, loadCustomers } = useCustomerStore();
  const {
    deliveries,
    loadDeliveries,
    getDeliveriesByDate,
    toggleDelivery,
    isLoading: deliveryLoading,
  } = useDeliveryStore();
  const { getCurrentRate, loadMilkRates } = useInventoryStore();
  const { dairy } = useDairyStore();
  const selectedDate = useUIStore((s) => s.selectedDate);
  const selectedShift = useUIStore((s) => s.selectedShift);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const setSelectedShift = useUIStore((s) => s.setSelectedShift);

  const dairyId = dairy?.id;

  // ─── Load data ─────────────────────────────────────────────────

  useEffect(() => {
    if (!dairyId) return;
    loadCustomers(dairyId);
    loadMilkRates(dairyId);
    // Load deliveries for a range around the selected date
    const from = addDays(parseISO(selectedDate), -7)
      .toISOString()
      .split("T")[0];
    const to = addDays(parseISO(selectedDate), 7)
      .toISOString()
      .split("T")[0];
    loadDeliveries(dairyId, from, to);
  }, [dairyId, selectedDate, loadCustomers, loadMilkRates, loadDeliveries]);

  // ─── Date navigation ───────────────────────────────────────────

  const goPrevDay = useCallback(() => {
    const prev = addDays(parseISO(selectedDate), -1);
    setSelectedDate(format(prev, "yyyy-MM-dd"));
  }, [selectedDate, setSelectedDate]);

  const goNextDay = useCallback(() => {
    const next = addDays(parseISO(selectedDate), 1);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  }, [selectedDate, setSelectedDate]);

  // ─── Filter customers by active + shift ────────────────────────

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!c.isActive) return false;
      if (c.shift === "both") return true;
      return c.shift === selectedShift;
    });
  }, [customers, selectedShift]);

  // ─── Get deliveries for selected date+shift ────────────────────

  const todayDeliveries = useMemo(() => {
    return getDeliveriesByDate(selectedDate, selectedShift);
  }, [selectedDate, selectedShift, getDeliveriesByDate, deliveries]);

  // ─── Build delivery map ────────────────────────────────────────

  const deliveryMap = useMemo(() => {
    const map = new Map<string, Delivery>();
    for (const d of todayDeliveries) {
      map.set(d.customerId, d);
    }
    return map;
  }, [todayDeliveries]);

  // ─── Counts ────────────────────────────────────────────────────

  const deliveredCount = useMemo(
    () =>
      filteredCustomers.filter(
        (c) => deliveryMap.get(c.id)?.status === "delivered"
      ).length,
    [filteredCustomers, deliveryMap]
  );

  const totalCount = filteredCustomers.length;

  // ─── Toggle handler ────────────────────────────────────────────

  const handleToggle = useCallback(
    async (customer: Customer) => {
      const rate = getCurrentRate(customer.milkType, selectedShift);
      const pricePerL = rate?.pricePerL ?? 0;
      await toggleDelivery(
        customer.id,
        selectedDate,
        selectedShift,
        customer.defaultQuantity,
        customer.milkType,
        pricePerL
      );
    },
    [selectedDate, selectedShift, toggleDelivery, getCurrentRate]
  );

  // ─── Milk type badge color ─────────────────────────────────────

  const milkBadgeClass = (milkType: string) => {
    switch (milkType) {
      case "cow":
        return "bg-sky-100 text-sky-700 border-sky-200";
      case "buffalo":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "mixed":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
      {/* Date Picker Row */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={goPrevDay}
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-foreground">
            {formatDate(selectedDate)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {selectedDate}
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={goNextDay}
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Shift Toggle */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        <button
          onClick={() => setSelectedShift("morning")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedShift === "morning"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sun className="w-4 h-4" />
          Morning
        </button>
        <button
          onClick={() => setSelectedShift("evening")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedShift === "evening"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Moon className="w-4 h-4" />
          Evening
        </button>
      </div>

      {/* Count Badge */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          <span className="text-emerald-600 font-bold">{deliveredCount}</span>
          <span className="text-muted-foreground">/{totalCount} delivered</span>
        </p>
        {deliveryLoading && (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Customer Delivery Cards */}
      {filteredCustomers.length === 0 ? (
        <Card className="py-0 gap-0">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No customers for this shift
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {filteredCustomers.map((customer, i) => {
            const delivery = deliveryMap.get(customer.id);
            const isDelivered = delivery?.status === "delivered";
            const isSkipped = delivery?.status === "skipped";
            const quantity = delivery?.quantity ?? customer.defaultQuantity;
            const rate = getCurrentRate(customer.milkType, selectedShift);
            const pricePerL = rate?.pricePerL ?? 0;
            const amount = quantity * pricePerL;

            return (
              <motion.div
                key={customer.id}
                custom={i}
                variants={cardVariants}
              >
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Card
                    className={`py-0 gap-0 cursor-pointer transition-colors select-none ${
                      isDelivered
                        ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800"
                        : isSkipped
                        ? "bg-muted/50 border-muted opacity-60"
                        : "bg-card hover:bg-accent/50"
                    }`}
                    onClick={() => handleToggle(customer)}
                  >
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-3 min-h-16">
                        {/* Status icon */}
                        <div className="shrink-0">
                          {isDelivered ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <Circle
                              className={`w-6 h-6 ${
                                isSkipped
                                  ? "text-muted-foreground/40"
                                  : "text-muted-foreground"
                              }`}
                            />
                          )}
                        </div>

                        {/* Customer info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold truncate">
                              {customer.name}
                            </p>
                            <Badge
                              className={`text-[10px] px-1.5 py-0 border ${milkBadgeClass(
                                customer.milkType
                              )}`}
                            >
                              {MILK_TYPES[customer.milkType] ?? customer.milkType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                            <span>
                              {quantity}L &times;{" "}
                              {formatCurrency(pricePerL).replace(/^-/, "")}
                              /L
                            </span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        </div>

                        {/* Delivered / Skipped label */}
                        <div className="shrink-0">
                          {isDelivered ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] border-0">
                              Delivered
                            </Badge>
                          ) : isSkipped ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              Skipped
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground"
                            >
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
