"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  CheckCircle2,
  Circle,
  Loader2,
  Minus,
  Plus,
  X,
  SkipForward,
  Edit3,
  IndianRupee,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCustomerStore, type Customer } from "@/stores/customer-store";
import { useDeliveryStore, type Delivery } from "@/stores/delivery-store";
import { useInventoryStore } from "@/stores/inventory-store";
import { useDairyStore } from "@/stores/dairy-store";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, roundTo2 } from "@/lib/accounting";
import {
  formatDate,
  MILK_TYPES,
  SHIFT_LABELS,
} from "@/lib/utils";
import { addDays, parseISO, format } from "date-fns";

// ─── Delivery Action Sheet ──────────────────────────────────────────
function DeliveryActionSheet({
  open,
  onOpenChange,
  customer,
  delivery,
  selectedDate,
  selectedShift,
  pricePerL,
  onMarkDelivered,
  onMarkSkipped,
  onUndo,
  onUpdateQuantity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  delivery: Delivery | undefined;
  selectedDate: string;
  selectedShift: "morning" | "evening";
  pricePerL: number;
  onMarkDelivered: (qty: number) => Promise<void>;
  onMarkSkipped: () => Promise<void>;
  onUndo: () => Promise<void>;
  onUpdateQuantity: (qty: number) => Promise<void>;
}) {
  const [editQty, setEditQty] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentQty = delivery?.quantity ?? customer?.defaultQuantity ?? 0;
  const isDelivered = delivery?.status === "delivered";
  const isSkipped = delivery?.status === "skipped";

  useEffect(() => {
    if (open) {
      setEditQty(String(currentQty));
      setIsEditing(false);
    }
  }, [open, currentQty]);

  if (!customer) return null;

  const handleSave = async () => {
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty < 0) return;
    setIsSaving(true);
    try {
      if (isDelivered) {
        await onUpdateQuantity(roundTo2(qty));
      } else {
        await onMarkDelivered(roundTo2(qty));
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await onMarkSkipped();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndo = async () => {
    setIsSaving(true);
    try {
      await onUndo();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const incrementQty = (delta: number) => {
    const current = parseFloat(editQty) || 0;
    const next = roundTo2(Math.max(0, current + delta));
    setEditQty(String(next));
  };

  const totalAmount = roundTo2((parseFloat(editQty) || 0) * pricePerL);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-w-lg mx-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-left">{customer.name}</SheetTitle>
          <SheetDescription className="text-left">
            {formatDate(selectedDate)} • {SHIFT_LABELS[selectedShift]} Shift • {MILK_TYPES[customer.milkType]}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-2 pb-4">
          {/* Current Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {isDelivered ? (
              <Badge className="bg-emerald-600 text-white text-xs border-0">
                <CheckCircle2 className="size-3 mr-1" /> Delivered
              </Badge>
            ) : isSkipped ? (
              <Badge variant="secondary" className="text-xs">
                <SkipForward className="size-3 mr-1" /> Skipped
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <Circle className="size-3 mr-1" /> Pending
              </Badge>
            )}
          </div>

          {/* Quantity Editor */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quantity (L)</span>
              {isEditing ? (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(true)}>
                  <Edit3 className="size-3 mr-1" /> Edit
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0"
                  onClick={() => incrementQty(-0.25)}
                >
                  <Minus className="size-4" />
                </Button>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="text-center text-lg font-bold h-10"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0"
                  onClick={() => incrementQty(0.25)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            ) : (
              <p className="text-2xl font-bold text-center">{currentQty} L</p>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{editQty}L × {formatCurrency(pricePerL)}/L</span>
              <span>=</span>
              <span className="font-semibold text-foreground">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Quick quantity buttons */}
          <div className="flex gap-2 flex-wrap">
            {[0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3].map((q) => (
              <Button
                key={q}
                variant={currentQty === q && !isEditing ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setEditQty(String(q));
                  setIsEditing(true);
                }}
              >
                {q}L
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {isDelivered ? (
              <>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
                  Update Delivery ({editQty}L)
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={handleUndo}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <X className="size-4 mr-2" />}
                  Undo Delivery (Mark Pending)
                </Button>
              </>
            ) : isSkipped ? (
              <>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={async () => { setIsSaving(true); try { await onMarkDelivered(currentQty); onOpenChange(false); } finally { setIsSaving(false); } }}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
                  Mark Delivered
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={handleUndo}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <X className="size-4 mr-2" />}
                  Undo Skip (Mark Pending)
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
                  Mark Delivered ({editQty}L)
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSkip}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <SkipForward className="size-4 mr-2" />}
                  Mark Absent / Skipped
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Delivery Board View ───────────────────────────────────────
export function DeliveryBoardView() {
  const { customers, loadCustomers } = useCustomerStore();
  const {
    deliveries,
    loadDeliveries,
    getDeliveriesByDate,
    addDelivery,
    updateDelivery,
    deleteDelivery,
    isLoading: deliveryLoading,
  } = useDeliveryStore();
  const { getCurrentRate, loadMilkRates } = useInventoryStore();
  const { dairy } = useDairyStore();
  const selectedDate = useUIStore((s) => s.selectedDate);
  const selectedShift = useUIStore((s) => s.selectedShift);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const setSelectedShift = useUIStore((s) => s.setSelectedShift);

  const dairyId = dairy?.id;

  // ─── Action Sheet state ─────────────────────────────────────────
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [markAllDialogOpen, setMarkAllDialogOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // ─── Load data ─────────────────────────────────────────────────

  useEffect(() => {
    if (!dairyId) return;
    loadCustomers(dairyId);
    loadMilkRates(dairyId);
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

  // ─── Counts & Totals ────────────────────────────────────────────

  const deliveredCount = useMemo(
    () =>
      filteredCustomers.filter(
        (c) => deliveryMap.get(c.id)?.status === "delivered"
      ).length,
    [filteredCustomers, deliveryMap]
  );

  const skippedCount = useMemo(
    () =>
      filteredCustomers.filter(
        (c) => deliveryMap.get(c.id)?.status === "skipped"
      ).length,
    [filteredCustomers, deliveryMap]
  );

  const pendingCount = filteredCustomers.length - deliveredCount - skippedCount;

  const totalLitres = useMemo(() => {
    return filteredCustomers.reduce((sum, c) => {
      const d = deliveryMap.get(c.id);
      if (d?.status === "delivered") return sum + d.quantity;
      return sum;
    }, 0);
  }, [filteredCustomers, deliveryMap]);

  const totalAmount = useMemo(() => {
    return filteredCustomers.reduce((sum, c) => {
      const d = deliveryMap.get(c.id);
      if (d?.status === "delivered") return sum + d.totalAmount;
      return sum;
    }, 0);
  }, [filteredCustomers, deliveryMap]);

  const totalCount = filteredCustomers.length;

  // ─── Quick toggle (single tap) ────────────────────────────────

  const handleQuickToggle = useCallback(
    async (customer: Customer) => {
      const delivery = deliveryMap.get(customer.id);
      const rate = getCurrentRate(customer.milkType, selectedShift);
      const pricePerL = rate?.pricePerL ?? 0;

      // If pending → mark delivered with default qty (quick action)
      if (!delivery || (delivery.status !== "delivered" && delivery.status !== "skipped")) {
        setTogglingId(customer.id);
        try {
          if (!delivery) {
            await addDelivery({
              customerId: customer.id,
              date: selectedDate,
              shift: selectedShift,
              quantity: customer.defaultQuantity,
              milkType: customer.milkType,
              pricePerL,
              status: "delivered",
            });
          } else {
            await updateDelivery(delivery.id, { status: "delivered", quantity: customer.defaultQuantity });
          }
        } finally {
          setTogglingId(null);
        }
      } else {
        // If already delivered/skipped → open action sheet
        setSelectedCustomer(customer);
        setActionSheetOpen(true);
      }
    },
    [selectedDate, selectedShift, addDelivery, updateDelivery, getCurrentRate, deliveryMap]
  );

  // ─── Long press / card click → open action sheet ───────────────

  const handleOpenActions = useCallback(
    (customer: Customer) => {
      setSelectedCustomer(customer);
      setActionSheetOpen(true);
    },
    []
  );

  // ─── Action Sheet handlers ──────────────────────────────────────

  const selectedDelivery = selectedCustomer
    ? deliveryMap.get(selectedCustomer.id)
    : undefined;

  const selectedPricePerL = selectedCustomer
    ? getCurrentRate(selectedCustomer.milkType, selectedShift)?.pricePerL ?? 0
    : 0;

  const handleMarkDelivered = useCallback(
    async (qty: number) => {
      if (!selectedCustomer) return;
      const rate = getCurrentRate(selectedCustomer.milkType, selectedShift);
      const pricePerL = rate?.pricePerL ?? 0;

      if (selectedDelivery) {
        await updateDelivery(selectedDelivery.id, {
          status: "delivered",
          quantity: qty,
          pricePerL,
        });
      } else {
        await addDelivery({
          customerId: selectedCustomer.id,
          date: selectedDate,
          shift: selectedShift,
          quantity: qty,
          milkType: selectedCustomer.milkType,
          pricePerL,
          status: "delivered",
        });
      }
    },
    [selectedCustomer, selectedDelivery, selectedDate, selectedShift, addDelivery, updateDelivery, getCurrentRate]
  );

  const handleMarkSkipped = useCallback(
    async () => {
      if (!selectedCustomer) return;
      const rate = getCurrentRate(selectedCustomer.milkType, selectedShift);
      const pricePerL = rate?.pricePerL ?? 0;

      if (selectedDelivery) {
        await updateDelivery(selectedDelivery.id, { status: "skipped", quantity: 0 });
      } else {
        await addDelivery({
          customerId: selectedCustomer.id,
          date: selectedDate,
          shift: selectedShift,
          quantity: 0,
          milkType: selectedCustomer.milkType,
          pricePerL,
          status: "skipped",
        });
      }
    },
    [selectedCustomer, selectedDelivery, selectedDate, selectedShift, addDelivery, updateDelivery, getCurrentRate]
  );

  const handleUndo = useCallback(
    async () => {
      if (!selectedDelivery) return;
      await deleteDelivery(selectedDelivery.id);
    },
    [selectedDelivery, deleteDelivery]
  );

  const handleUpdateQuantity = useCallback(
    async (qty: number) => {
      if (!selectedDelivery) return;
      const rate = getCurrentRate(selectedCustomer!.milkType, selectedShift);
      const pricePerL = rate?.pricePerL ?? 0;
      await updateDelivery(selectedDelivery.id, { quantity: qty, pricePerL });
    },
    [selectedDelivery, selectedCustomer, selectedShift, updateDelivery, getCurrentRate]
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

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-2.5 text-center">
          <p className="text-lg font-bold text-emerald-600">{deliveredCount}</p>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Delivered</p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2.5 text-center">
          <p className="text-lg font-bold text-amber-600">{skippedCount}</p>
          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Absent</p>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 p-2.5 text-center">
          <p className="text-lg font-bold text-gray-600">{pendingCount}</p>
          <p className="text-[10px] text-gray-700 dark:text-gray-400 font-medium">Pending</p>
        </div>
      </div>

      {/* Total summary bar */}
      {(deliveredCount > 0) && (
        <div className="flex items-center justify-between rounded-xl bg-card border px-3 py-2.5">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Qty</p>
              <p className="text-sm font-bold">{roundTo2(totalLitres)}L</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Amt</p>
              <p className="text-sm font-bold flex items-center gap-0.5">
                <IndianRupee className="size-3" />
                {formatCurrency(totalAmount).replace(/^-/, "")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{totalCount} customers</p>
            <p className="text-sm font-semibold text-emerald-600">
              {deliveredCount}/{totalCount} done
            </p>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {deliveryLoading && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* "Mark All Delivered" button */}
      {pendingCount > 0 && (
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={markingAll}
          onClick={() => setMarkAllDialogOpen(true)}
        >
          {markingAll ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4 mr-2" />
          )}
          {markingAll ? "Marking all..." : `Mark All ${pendingCount} Pending as Delivered`}
        </Button>
      )}

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
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredCustomers.map((customer, i) => {
              const delivery = deliveryMap.get(customer.id);
              const isDelivered = delivery?.status === "delivered";
              const isSkipped = delivery?.status === "skipped";
              const isPending = !delivery || (delivery.status !== "delivered" && delivery.status !== "skipped");
              const quantity = delivery?.quantity ?? customer.defaultQuantity;
              const rate = getCurrentRate(customer.milkType, selectedShift);
              const pricePerL = rate?.pricePerL ?? 0;
              const amount = quantity * pricePerL;
              const isToggling = togglingId === customer.id;

              return (
                <motion.div
                  key={customer.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                >
                  <Card
                    className={`py-0 gap-0 transition-colors select-none ${
                      isDelivered
                        ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800"
                        : isSkipped
                        ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 opacity-70"
                        : "bg-card hover:bg-accent/50 border-dashed"
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Status icon - quick toggle */}
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          className="shrink-0"
                          onClick={() => handleQuickToggle(customer)}
                          disabled={isToggling}
                        >
                          {isToggling ? (
                            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                          ) : isDelivered ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          ) : isSkipped ? (
                            <SkipForward className="w-6 h-6 text-amber-500" />
                          ) : (
                            <Circle className="w-6 h-6 text-muted-foreground" />
                          )}
                        </motion.button>

                        {/* Customer info - tap to open action sheet */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleOpenActions(customer)}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`text-sm font-semibold truncate ${isSkipped ? "line-through opacity-70" : ""}`}>
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
                              {isSkipped ? "0L" : `${quantity}L`} ×{" "}
                              {formatCurrency(pricePerL).replace(/^-/, "")}
                              /L
                            </span>
                            {!isSkipped && (
                              <span className="font-semibold text-foreground">
                                {formatCurrency(amount)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status badge + edit */}
                        <div className="shrink-0 flex items-center gap-1">
                          {isDelivered ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] border-0">
                              Delivered
                            </Badge>
                          ) : isSkipped ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-amber-100 text-amber-700 border-amber-200"
                            >
                              Absent
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground"
                            >
                              Pending
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenActions(customer)}
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Delivery Action Sheet */}
      <DeliveryActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        customer={selectedCustomer}
        delivery={selectedDelivery}
        selectedDate={selectedDate}
        selectedShift={selectedShift}
        pricePerL={selectedPricePerL}
        onMarkDelivered={handleMarkDelivered}
        onMarkSkipped={handleMarkSkipped}
        onUndo={handleUndo}
        onUpdateQuantity={handleUpdateQuantity}
      />

      {/* Mark All Delivered Confirmation */}
      <AlertDialog open={markAllDialogOpen} onOpenChange={setMarkAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark All as Delivered?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark all {pendingCount} pending customers as delivered with their default quantities for the {SHIFT_LABELS[selectedShift]} shift. You can still edit individual deliveries afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={markingAll}
              onClick={async () => {
                setMarkingAll(true);
                try {
                  const pendingCustomers = filteredCustomers.filter((c) => {
                    const d = deliveryMap.get(c.id);
                    return !d || (d.status !== "delivered" && d.status !== "skipped");
                  });
                  for (const customer of pendingCustomers) {
                    const rate = getCurrentRate(customer.milkType, selectedShift);
                    const pricePerL = rate?.pricePerL ?? 0;
                    const existing = deliveryMap.get(customer.id);
                    if (existing) {
                      await updateDelivery(existing.id, {
                        status: "delivered",
                        quantity: customer.defaultQuantity,
                        pricePerL,
                      });
                    } else {
                      await addDelivery({
                        customerId: customer.id,
                        date: selectedDate,
                        shift: selectedShift,
                        quantity: customer.defaultQuantity,
                        milkType: customer.milkType,
                        pricePerL,
                        status: "delivered",
                      });
                    }
                  }
                } catch (err) {
                  console.error("Mark all delivered error:", err);
                } finally {
                  setMarkingAll(false);
                  setMarkAllDialogOpen(false);
                }
              }}
            >
              {markingAll ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              {markingAll ? "Marking..." : "Yes, Mark All Delivered"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
