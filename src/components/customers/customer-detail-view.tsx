"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import {
  ArrowLeft,
  Phone,
  Pencil,
  Plus,
  IndianRupee,
  Sun,
  Moon,
  Sunrise,
  Truck,
  CreditCard,
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  UserCog,
  Banknote,
  Share2,
  Droplets,
  Calendar,
  Send,
  MessageSquare,
  Copy,
  Check,
  Info,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { customerSchema, paymentSchema, type CustomerInput, type PaymentInput } from "@/lib/validators";
import { useCustomerStore, type Customer } from "@/stores/customer-store";
import { useDairyStore } from "@/stores/dairy-store";
import { useUIStore } from "@/stores/ui-store";
import { useDeliveryStore, type Delivery } from "@/stores/delivery-store";
import { usePaymentStore, type Payment } from "@/stores/payment-store";
import { formatCurrency } from "@/lib/accounting";
import {
  getInitials,
  MILK_TYPES,
  SHIFT_LABELS,
  BILLING_TYPE_LABELS,
  PAYMENT_MODES,
  getDatesInMonth,
  formatDate,
  formatDateForInput,
  getMonthRange,
} from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

// ─── Billing Cycle Utilities ────────────────────────────────────────

/**
 * Extract the day number from a date string, avoiding timezone issues.
 * Works with both "2024-05-25" and "2024-05-25T10:30:00.000Z" formats.
 */
function extractDateParts(dateStr: string): { year: number; month: number; day: number } {
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = dateOnly.split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10) - 1, // 0-indexed
    day: parseInt(parts[2], 10),
  };
}

/**
 * Calculate billing cycle dates based on customer start date.
 * E.g., if customer started on 5th May:
 *   Cycle 1: 5 May - 4 June
 *   Cycle 2: 5 June - 4 July
 * Given a reference date, find which cycle we're in.
 *
 * Handles edge cases: start days 29/30/31 in months with fewer days.
 * Shows the FULL billing cycle (not capped to today) so user can see the complete period.
 */
function getBillingCycle(
  startDateStr: string,
  referenceDate: Date = new Date()
): { start: Date; end: Date; startStr: string; endStr: string } {
  const { year: startYear, month: startMonth, day: startDay } = extractDateParts(startDateStr);
  const ref = referenceDate;

  // Determine which cycle the reference date falls in
  let cycleStartYear: number, cycleStartMonth: number;

  if (ref.getDate() >= startDay) {
    // We're in a cycle that started this month
    cycleStartYear = ref.getFullYear();
    cycleStartMonth = ref.getMonth();
  } else {
    // We're in a cycle that started last month
    cycleStartMonth = ref.getMonth() - 1;
    cycleStartYear = ref.getFullYear();
    if (cycleStartMonth < 0) {
      cycleStartMonth = 11;
      cycleStartYear--;
    }
  }

  // Clamp start day to max days in that month (handles 29/30/31 edge cases)
  const maxDaysInStartMonth = new Date(cycleStartYear, cycleStartMonth + 1, 0).getDate();
  const actualStartDay = Math.min(startDay, maxDaysInStartMonth);
  const cycleStart = new Date(cycleStartYear, cycleStartMonth, actualStartDay);

  // End date: (startDay - 1) of the next month, clamped to max days in end month
  let endMonth = cycleStartMonth + 1;
  let endYear = cycleStartYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear++;
  }

  const maxDaysInEndMonth = new Date(endYear, endMonth + 1, 0).getDate();
  let cycleEnd: Date;

  if (startDay === 1) {
    // If start day is 1st, end = last day of same month
    cycleEnd = new Date(cycleStartYear, cycleStartMonth + 1, 0);
  } else {
    const endDay = Math.min(startDay - 1, maxDaysInEndMonth);
    cycleEnd = new Date(endYear, endMonth, endDay > 0 ? endDay : maxDaysInEndMonth);
  }

  // Don't go before customer's actual start date
  const customerStartDate = new Date(startYear, startMonth, startDay);
  if (cycleStart < customerStartDate) {
    cycleStart.setTime(customerStartDate.getTime());
  }

  // NOTE: Do NOT cap cycleEnd to today - show full billing cycle period
  // Future dates in calendar will be shown with a distinct style

  return {
    start: cycleStart,
    end: cycleEnd,
    startStr: format(cycleStart, "yyyy-MM-dd"),
    endStr: format(cycleEnd, "yyyy-MM-dd"),
  };
}

/**
 * Navigate to next/prev billing cycle
 */
function getNextBillingCycle(startDateStr: string, currentCycleStart: Date): { start: Date; end: Date; startStr: string; endStr: string } {
  const nextStart = new Date(currentCycleStart);
  nextStart.setMonth(nextStart.getMonth() + 1);
  return getBillingCycle(startDateStr, nextStart);
}

function getPrevBillingCycle(startDateStr: string, currentCycleStart: Date): { start: Date; end: Date; startStr: string; endStr: string } {
  const prevStart = new Date(currentCycleStart);
  prevStart.setMonth(prevStart.getMonth() - 1);
  return getBillingCycle(startDateStr, prevStart);
}

/**
 * Generate a list of billing cycles for navigation (current + past N months)
 */
function getBillingCycleList(startDateStr: string, count: number = 6): Array<{ start: Date; end: Date; startStr: string; endStr: string; label: string }> {
  const cycles: Array<{ start: Date; end: Date; startStr: string; endStr: string; label: string }> = [];
  const currentCycle = getBillingCycle(startDateStr);
  cycles.push({ ...currentCycle, label: `${format(currentCycle.start, 'd MMM')} - ${format(currentCycle.end, 'd MMM yyyy')}` });

  let prevStart = currentCycle.start;
  for (let i = 1; i < count; i++) {
    const prev = getPrevBillingCycle(startDateStr, prevStart);
    // Don't go before customer's actual start date
    const { year, month, day } = extractDateParts(startDateStr);
    const customerStartDate = new Date(year, month, day);
    if (prev.end < customerStartDate) break;
    cycles.push({ ...prev, label: `${format(prev.start, 'd MMM')} - ${format(prev.end, 'd MMM yyyy')}` });
    prevStart = prev.start;
  }

  return cycles;
}

/**
 * Get all dates in a range (for calendar grid)
 */
function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  const current = new Date(start);
  while (current <= end) {
    dates.push(format(current, "yyyy-MM-dd"));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Calculate carry-forward amount from previous billing cycles
 * This is the total outstanding from all deliveries/payments BEFORE the current cycle start
 */
function calculateCarryForward(
  customer: Customer,
  allDeliveries: Delivery[],
  allPayments: Payment[],
  cycleStartStr: string
): { carryForward: number; previousTotalDeliveries: number; previousTotalPayments: number } {
  // Filter to only deliveries/payments BEFORE the current cycle
  const previousDeliveries = allDeliveries.filter(
    (d) => d.date < cycleStartStr && d.status === "delivered"
  );
  const previousPayments = allPayments.filter(
    (p) => p.date < cycleStartStr
  );

  const previousTotalDeliveries = previousDeliveries.reduce(
    (sum, d) => sum + d.totalAmount, 0
  );
  const previousTotalPayments = previousPayments.reduce(
    (sum, p) => sum + p.amount, 0
  );

  // Add opening balance
  const openingBalance = customer.openingBalance || 0;
  
  // For postpaid: carry-forward = (deliveries + opening) - payments
  // For prepaid: carry-forward = payments + opening - deliveries (negative means they owe)
  let carryForward = 0;
  if (customer.billingType === "postpaid") {
    carryForward = previousTotalDeliveries + openingBalance - previousTotalPayments;
  } else {
    // Prepaid: if negative, customer has used more than they paid
    carryForward = previousTotalPayments + openingBalance - previousTotalDeliveries;
    // Invert: positive means they owe
    carryForward = -carryForward;
  }

  return { carryForward: Math.max(0, carryForward), previousTotalDeliveries, previousTotalPayments };
}

// ─── Customer Start Date Helper ─────────────────────────────────────
/**
 * Get the customer's actual service start date.
 * Uses `startDate` if available (set during customer creation),
 * otherwise falls back to `createdAt` (system creation timestamp).
 */
function getCustomerStartDate(customer: Customer): string {
  return customer.startDate || customer.createdAt;
}

// ─── Shift Icon ────────────────────────────────────────────────────
function ShiftIcon({ shift, className }: { shift: string; className?: string }) {
  switch (shift) {
    case "morning":
      return <Sun className={`text-amber-500 ${className ?? ""}`} />;
    case "evening":
      return <Moon className={`text-indigo-400 ${className ?? ""}`} />;
    case "both":
      return <Sunrise className={`text-emerald-500 ${className ?? ""}`} />;
    default:
      return null;
  }
}

// ─── Badge helpers ─────────────────────────────────────────────────
function billingBadgeVariant(
  type: string
): "default" | "secondary" | "destructive" | "outline" {
  return type === "prepaid" ? "default" : "secondary";
}

function milkBadgeClass(type: string): string {
  switch (type) {
    case "cow":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "buffalo":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "mixed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:
      return "";
  }
}

// ─── Calendar Cell ─────────────────────────────────────────────────
function CalendarCell({
  dateStr,
  deliveries,
  isInCycle,
  isToday,
  isFuture,
}: {
  dateStr: string;
  deliveries: Delivery[];
  isInCycle: boolean;
  isToday: boolean;
  isFuture: boolean;
}) {
  const dayNum = format(parseISO(dateStr), "d");
  const delivered = deliveries.filter((d) => d.status === "delivered");
  const skipped = deliveries.filter((d) => d.status === "skipped" || d.status === "cancelled");

  let bgColor = "bg-muted/40";
  let textColor = "text-foreground/60";
  let quantity: string | null = null;
  let borderClass = "";

  if (delivered.length > 0) {
    bgColor = "bg-emerald-100 dark:bg-emerald-900/40";
    textColor = "text-emerald-700 dark:text-emerald-300";
    const totalQty = delivered.reduce((sum, d) => sum + d.quantity, 0);
    quantity = `${totalQty}L`;
  } else if (skipped.length > 0) {
    bgColor = "bg-red-100 dark:bg-red-900/30";
    textColor = "text-red-600 dark:text-red-400";
  } else if (isFuture && isInCycle) {
    // Future dates in cycle - show with dashed border to indicate pending
    bgColor = "bg-blue-50 dark:bg-blue-950/20";
    textColor = "text-blue-400 dark:text-blue-500";
    borderClass = "border border-dashed border-blue-200 dark:border-blue-800";
  } else if (isInCycle) {
    bgColor = "bg-gray-100 dark:bg-gray-800/40";
    textColor = "text-gray-400 dark:text-gray-500";
  }

  // Today marker - add a ring/highlight
  const todayRing = isToday ? "ring-2 ring-amber-400 ring-offset-1" : "";

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-md p-1 min-h-[2.5rem] ${bgColor} ${textColor} ${borderClass} ${todayRing} transition-colors`}
      title={`${format(parseISO(dateStr), "dd MMM yyyy")}${isToday ? " (Today)" : ""}${quantity ? ` — ${quantity}` : ""}${isFuture && isInCycle ? " (Pending)" : ""}`}
    >
      <span className={`text-[10px] font-medium leading-none ${isToday ? "font-bold text-amber-600 dark:text-amber-400" : ""}`}>
        {dayNum}
      </span>
      {quantity && (
        <span className="text-[9px] leading-tight mt-0.5 font-semibold">
          {quantity}
        </span>
      )}
      {isFuture && isInCycle && !quantity && (
        <span className="text-[8px] leading-tight mt-0.5 opacity-60">—</span>
      )}
    </div>
  );
}

// ─── Add Payment Dialog ────────────────────────────────────────────
function AddPaymentDialog({
  open,
  onOpenChange,
  customerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}) {
  const { addPayment } = usePaymentStore();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      customerId,
      amount: 0,
      paymentMode: "cash",
      date: formatDateForInput(),
      notes: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        customerId,
        amount: 0,
        paymentMode: "cash",
        date: formatDateForInput(),
        notes: "",
      });
    }
  }, [open, customerId, form]);

  const onSubmit = async (data: PaymentInput) => {
    setSubmitting(true);
    try {
      await addPayment(data);
      onOpenChange(false);
    } catch {
      // error handled in store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="size-5 text-emerald-600" />
            Add Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment received from this customer.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="add-payment-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Amount (₹) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-payment-form"
            className="btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Customer Dialog ──────────────────────────────────────────
function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
}) {
  const { updateCustomer } = useCustomerStore();
  const [submitting, setSubmitting] = useState(false);
  const [quantityEffectiveFrom, setQuantityEffectiveFrom] = useState(formatDateForInput());
  const [showQtyChangeDate, setShowQtyChangeDate] = useState(false);

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: customer.name,
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      billingType: customer.billingType,
      milkType: customer.milkType,
      defaultQuantity: customer.defaultQuantity,
      shift: customer.shift,
      openingBalance: customer.openingBalance,
      isActive: customer.isActive,
      startDate: customer.startDate || "",
    },
  });

  const currentDefaultQty = form.watch("defaultQuantity");
  const quantityChanged = currentDefaultQty !== customer.defaultQuantity;

  // Reset when dialog opens with fresh data
  useEffect(() => {
    if (open) {
      form.reset({
        name: customer.name,
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        billingType: customer.billingType,
        milkType: customer.milkType,
        defaultQuantity: customer.defaultQuantity,
        shift: customer.shift,
        openingBalance: customer.openingBalance,
        isActive: customer.isActive,
        startDate: customer.startDate || "",
      });
      setQuantityEffectiveFrom(formatDateForInput());
      setShowQtyChangeDate(false);
    }
  }, [open, customer, form]);

  const onSubmit = async (data: CustomerInput) => {
    setSubmitting(true);
    try {
      const updateData: Record<string, unknown> = { ...data };
      // If quantity changed, include the effective date
      if (quantityChanged && showQtyChangeDate && quantityEffectiveFrom) {
        updateData.quantityEffectiveFrom = quantityEffectiveFrom;
      }
      await updateCustomer(customer.id, updateData);
      onOpenChange(false);
    } catch {
      // error handled in store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="size-5 text-emerald-600" />
            Edit Customer
          </DialogTitle>
          <DialogDescription>
            Update customer details and preferences.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="edit-customer-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98765 43210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street, City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="billingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="prepaid" id="edit-prepaid" />
                        <Label htmlFor="edit-prepaid" className="cursor-pointer">
                          Prepaid
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="postpaid" id="edit-postpaid" />
                        <Label htmlFor="edit-postpaid" className="cursor-pointer">
                          Postpaid
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="milkType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milk Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cow">Cow Milk</SelectItem>
                        <SelectItem value="buffalo">Buffalo Milk</SelectItem>
                        <SelectItem value="mixed">Mixed Milk</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="defaultQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Qty (L)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity Change Effective Date */}
            {quantityChanged && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="qty-change-track"
                    checked={showQtyChangeDate}
                    onChange={(e) => setShowQtyChangeDate(e.target.checked)}
                    className="rounded border-amber-300"
                  />
                  <Label htmlFor="qty-change-track" className="text-xs font-medium text-amber-800 dark:text-amber-300 cursor-pointer">
                    Track quantity change ({customer.defaultQuantity}L → {currentDefaultQty}L)
                  </Label>
                </div>
                {showQtyChangeDate && (
                  <div className="space-y-1.5 pl-6">
                    <Label className="text-[11px] text-foreground/60">
                      Effective from date
                    </Label>
                    <Input
                      type="date"
                      value={quantityEffectiveFrom}
                      onChange={(e) => setQuantityEffectiveFrom(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] text-foreground/60">
                      This records when the new quantity took effect for ledger history.
                    </p>
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="openingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Balance (&#8377;)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date (Billing Cycle)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <p className="text-[10px] text-foreground/60">
                    Is date se billing cycle calculate hoga. Example: 25 May se start = 25 May - 24 June.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-customer-form"
            className="btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Share Bill Dialog ──────────────────────────────────────────────
function ShareBillDialog({
  open,
  onOpenChange,
  customer,
  customerDeliveries,
  customerPayments,
  billingCycle,
  cycleStats,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  customerDeliveries: Delivery[];
  customerPayments: Payment[];
  billingCycle: { start: Date; end: Date; startStr: string; endStr: string };
  cycleStats: {
    totalLiters: number;
    totalAmount: number;
    totalPayments: number;
    netBalance: number;
    carryForward: number;
    previousTotalDeliveries: number;
    previousTotalPayments: number;
    deliveredDays: number;
    skippedDays: number;
    totalCycleDays: number;
    elapsedDays: number;
  } | null;
}) {
  const { dairy } = useDairyStore();
  const [copied, setCopied] = useState(false);

  // Default date range: current billing cycle start/end
  const [fromDate, setFromDate] = useState(billingCycle.startStr);
  const [toDate, setToDate] = useState(billingCycle.endStr);

  // Reset dates when dialog opens (React pattern: setState during render for prop-driven state)
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setFromDate(billingCycle.startStr);
    setToDate(billingCycle.endStr);
    setCopied(false);
    setPrevOpen(true);
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Filter deliveries/payments by selected date range
  const filteredDeliveries = useMemo(() => {
    return customerDeliveries.filter(
      (d) => d.date >= fromDate && d.date <= toDate
    );
  }, [customerDeliveries, fromDate, toDate]);

  const filteredPayments = useMemo(() => {
    return customerPayments.filter(
      (p) => p.date >= fromDate && p.date <= toDate
    );
  }, [customerPayments, fromDate, toDate]);

  // Compute bill stats
  const billStats = useMemo(() => {
    const delivered = filteredDeliveries.filter(
      (d) => d.status === "delivered"
    );

    // Unique delivered dates
    const deliveredDates = new Set(delivered.map((d) => d.date));
    const totalDays = deliveredDates.size;

    const totalQuantity = delivered.reduce((sum, d) => sum + d.quantity, 0);
    const totalAmount = delivered.reduce(
      (sum, d) => sum + d.totalAmount,
      0
    );
    const totalPayments = filteredPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // Get the most common rate from delivered items
    const rateMap: Record<number, number> = {};
    for (const d of delivered) {
      rateMap[d.pricePerL] = (rateMap[d.pricePerL] || 0) + 1;
    }
    const mostCommonRate = Object.entries(rateMap).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const rate = mostCommonRate ? parseFloat(mostCommonRate[0]) : 0;

    // Carry-forward from cycleStats if available and dates match the billing cycle
    const carryForward = (cycleStats && fromDate === billingCycle.startStr && toDate === billingCycle.endStr)
      ? cycleStats.carryForward
      : 0;

    const totalBill = totalAmount + carryForward;
    const balanceDue = totalBill - totalPayments;

    return { totalDays, totalQuantity, totalAmount, totalPayments, rate, carryForward, totalBill, balanceDue };
  }, [filteredDeliveries, filteredPayments, cycleStats, fromDate, toDate, billingCycle.startStr, billingCycle.endStr]);

  // Format date for display: "dd MMM yyyy"
  const formatDateDisplay = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  // Build the bill message
  const billMessage = useMemo(() => {
    const dairyName = dairy?.name ?? "Dairy";
    const dairyPhone = dairy?.phone ?? "";
    const milkLabel =
      customer.milkType === "cow"
        ? "Cow"
        : customer.milkType === "buffalo"
          ? "Buffalo"
          : "Mixed";
    const shiftLabel =
      customer.shift === "morning"
        ? "Morning"
        : customer.shift === "evening"
          ? "Evening"
          : "Both";

    const customerSince = format(parseISO(getCustomerStartDate(customer).split('T')[0]), "dd MMM yyyy");

    const lines = [
      `🥛 *${dairyName}* - Milk Bill`,
      `━━━━━━━━━━━━━━━━━`,
      `👤 Customer: ${customer.name}`,
      `📅 Billing Period: ${formatDateDisplay(fromDate)} to ${formatDateDisplay(toDate)}`,
      `🕐 Customer Since: ${customerSince}`,
      `━━━━━━━━━━━━━━━━━`,
      `🥛 Milk Type: ${milkLabel}`,
      `🕐 Shift: ${shiftLabel}`,
      `📊 Total Delivery: ${billStats.totalDays} days`,
      `📦 Total Quantity: ${billStats.totalQuantity.toFixed(1)} Liters`,
      `💰 Rate: ₹${billStats.rate}/Liter`,
      `━━━━━━━━━━━━━━━━━`,
    ];

    if (billStats.carryForward > 0) {
      lines.push(`📌 Pichle Month ka Baki: ₹${billStats.carryForward.toFixed(2)}`);
      lines.push(`━━━━━━━━━━━━━━━━━`);
    }

    lines.push(`💵 Is Period ka Bill: ₹${billStats.totalAmount.toFixed(2)}`);
    
    if (billStats.carryForward > 0) {
      lines.push(`💵 Total Bill (incl. baki): ₹${billStats.totalBill.toFixed(2)}`);
    }
    
    lines.push(`✅ Payment Done: ₹${billStats.totalPayments.toFixed(2)}`);
    lines.push(`${billStats.balanceDue > 0 ? "🔴" : "🟢"} Bakaya/Outstanding: ₹${Math.abs(billStats.balanceDue).toFixed(2)}`);
    lines.push(`━━━━━━━━━━━━━━━━━`);
    lines.push(`Thank you! 🙏`);
    lines.push(`${dairyName}${dairyPhone ? ` | ${dairyPhone}` : ""}`);

    return lines.join("\n");
  }, [dairy, customer, fromDate, toDate, billStats]);

  // Share via Web Share API
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Milk Bill", text: billMessage });
      } else {
        await navigator.clipboard.writeText(billMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled or error
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(billMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // WhatsApp share
  const handleWhatsApp = () => {
    if (!customer.phone) return;
    // Clean phone number: remove spaces, add country code 91 if not present
    let phone = customer.phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    if (phone.startsWith("+")) {
      phone = phone.substring(1);
    }
    if (!phone.startsWith("91") && phone.length === 10) {
      phone = "91" + phone;
    }
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(billMessage)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-emerald-600" />
            Share Bill
          </DialogTitle>
          <DialogDescription>
            Generate and share a milk bill for this customer.
          </DialogDescription>
        </DialogHeader>

        {/* Date Range Selector */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">From Date</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">To Date</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Bill Preview */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground/60">
            Bill Preview
          </Label>
          <div className="rounded-lg border bg-muted/30 p-3 max-h-60 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">
              {billMessage}
            </pre>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-foreground/60">
            <Droplets className="size-3.5 text-sky-500" />
            <span>{billStats.totalQuantity.toFixed(1)} Liters</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground/60">
            <Calendar className="size-3.5 text-amber-500" />
            <span>{billStats.totalDays} days</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground/60">
            <IndianRupee className="size-3.5 text-emerald-500" />
            <span>₹{billStats.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground/60">
            <CreditCard className="size-3.5 text-violet-500" />
            <span>₹{billStats.totalPayments.toFixed(2)} paid</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            onClick={handleShare}
          >
            <Send className="size-4 mr-2" />
            Share Bill
          </Button>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-4 mr-2 text-emerald-600" />
              ) : (
                <Copy className="size-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy Text"}
            </Button>
            {customer.phone && (
              <Button
                variant="outline"
                className="flex-1 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30"
                onClick={handleWhatsApp}
              >
                <MessageSquare className="size-4 mr-2" />
                WhatsApp
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Customer Detail View ─────────────────────────────────────
export function CustomerDetailView() {
  const { selectedCustomerId, navigate } = useUIStore();
  const { getCustomerById, loadCustomers } = useCustomerStore();
  const { dairy } = useDairyStore();
  const { deliveries, loadDeliveries, getDeliveriesByCustomer } =
    useDeliveryStore();
  const { payments, loadPayments, getPaymentsByCustomer } = usePaymentStore();

  const { deleteCustomer } = useCustomerStore();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareBillDialogOpen, setShareBillDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [billingCycle, setBillingCycle] = useState<{
    start: Date;
    end: Date;
    startStr: string;
    endStr: string;
  } | null>(null);

  const customer = selectedCustomerId
    ? getCustomerById(selectedCustomerId)
    : undefined;

  // Initialize billing cycle based on customer start date
  // FIX: prevCustomerId must start as undefined so the first render with a customer triggers cycle init
  const [prevCustomerId, setPrevCustomerId] = useState<string | undefined>(undefined);
  if (customer && customer.id !== prevCustomerId) {
    const cycle = getBillingCycle(getCustomerStartDate(customer));
    setBillingCycle(cycle);
    setPrevCustomerId(customer.id);
  }

  // Fetch fresh data - wider range for carry-forward calculation
  useEffect(() => {
    if (dairy?.id && customer) {
      loadCustomers(dairy.id);
      // Fetch a wider range - last 12 months for carry-forward
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const rangeStart = format(twelveMonthsAgo, "yyyy-MM-dd");
      const rangeEnd = formatDateForInput();
      loadDeliveries(dairy.id, rangeStart, rangeEnd);
      loadPayments(dairy.id, rangeStart, rangeEnd);
    }
  }, [dairy?.id, customer?.id, loadCustomers, loadDeliveries, loadPayments]);

  // Get deliveries and payments for this customer
  const customerDeliveries = useMemo(
    () =>
      selectedCustomerId
        ? getDeliveriesByCustomer(selectedCustomerId)
        : [],
    [selectedCustomerId, deliveries, getDeliveriesByCustomer]
  );

  const customerPayments = useMemo(
    () =>
      selectedCustomerId ? getPaymentsByCustomer(selectedCustomerId) : [],
    [selectedCustomerId, payments, getPaymentsByCustomer]
  );

  // Calendar grid dates for the billing cycle
  const calendarDates = useMemo(() => {
    if (!billingCycle) return [];
    return getDatesInRange(billingCycle.startStr, billingCycle.endStr);
  }, [billingCycle]);

  // Map deliveries by date for the calendar
  const deliveriesByDate = useMemo(() => {
    const map: Record<string, Delivery[]> = {};
    for (const d of customerDeliveries) {
      if (!map[d.date]) map[d.date] = [];
      map[d.date].push(d);
    }
    return map;
  }, [customerDeliveries]);

  // Billing cycle stats (includes carry-forward from previous cycles)
  const cycleStats = useMemo(() => {
    if (!billingCycle || !customer) return null;

    const cycleDeliveries = customerDeliveries.filter(
      (d) => d.date >= billingCycle.startStr && d.date <= billingCycle.endStr
    );
    const cyclePayments = customerPayments.filter(
      (p) => p.date >= billingCycle.startStr && p.date <= billingCycle.endStr
    );

    const deliveredInCycle = cycleDeliveries.filter((d) => d.status === "delivered");

    const totalLiters = deliveredInCycle.reduce((sum, d) => sum + d.quantity, 0);
    const totalAmount = deliveredInCycle.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalPayments = cyclePayments.reduce((sum, p) => sum + p.amount, 0);

    // Count delivered days and skipped days
    const deliveredDays = new Set(deliveredInCycle.map((d) => d.date)).size;
    const skippedDays = cycleDeliveries.filter((d) => d.status === "skipped" || d.status === "cancelled").length;

    // Carry-forward from previous cycles
    const carryForwardData = calculateCarryForward(
      customer, customerDeliveries, customerPayments, billingCycle.startStr
    );

    const netBalance = totalAmount + carryForwardData.carryForward - totalPayments;

    // Calculate total cycle days (full period)
    const totalCycleDays = calendarDates.length;
    
    // Days elapsed so far (up to today)
    const todayStr = formatDateForInput();
    const elapsedDates = calendarDates.filter((d) => d <= todayStr);
    const elapsedDays = elapsedDates.length;

    return {
      totalLiters,
      totalAmount,
      totalPayments,
      netBalance,
      carryForward: carryForwardData.carryForward,
      previousTotalDeliveries: carryForwardData.previousTotalDeliveries,
      previousTotalPayments: carryForwardData.previousTotalPayments,
      deliveredDays,
      skippedDays,
      totalCycleDays,
      elapsedDays,
    };
  }, [customer, customerDeliveries, customerPayments, billingCycle, calendarDates]);

  // Billing cycle navigation
  const prevCycle = useCallback(() => {
    if (!customer || !billingCycle) return;
    const startDateStr = getCustomerStartDate(customer);
    const prev = getPrevBillingCycle(startDateStr, billingCycle.start);
    // Don't go before customer start date
    const { year, month, day } = extractDateParts(startDateStr);
    const customerStartDate = new Date(year, month, day);
    if (prev.end >= customerStartDate) {
      setBillingCycle(prev);
    }
  }, [customer, billingCycle]);

  const nextCycle = useCallback(() => {
    if (!customer || !billingCycle) return;
    const next = getNextBillingCycle(getCustomerStartDate(customer), billingCycle.start);
    // Allow navigating to the current cycle (start <= today) or the upcoming cycle
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    if (next.start <= new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0)) {
      setBillingCycle(next);
    }
  }, [customer, billingCycle]);

  // Billing cycle list for month-wise navigation
  const billingCycleList = useMemo(() => {
    if (!customer) return [];
    return getBillingCycleList(getCustomerStartDate(customer), 5);
  }, [customer]);

  // Check if current viewed cycle is the "current" (active) cycle
  const isViewingCurrentCycle = useMemo(() => {
    if (!billingCycle || !customer) return true;
    const currentCycle = getBillingCycle(getCustomerStartDate(customer));
    return billingCycle.startStr === currentCycle.startStr;
  }, [billingCycle, customer]);

  const todayStr = formatDateForInput();

  // ─── No customer selected ───────────────────────────────────────
  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
          <IndianRupee className="size-8 text-foreground/60" />
        </div>
        <p className="text-foreground/60 text-sm">Customer not found</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("customers")}
        >
          <ArrowLeft className="size-4 mr-1.5" />
          Back to Customers
        </Button>
      </div>
    );
  }

  // ─── Day-of-week headers for calendar ───────────────────────────
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  // First day offset for the billing cycle calendar
  const firstDayOffset = billingCycle ? billingCycle.start.getDay() : 0;

  // Check if this billing cycle has completed (end date is before today)
  const isCycleCompleted = billingCycle
    ? billingCycle.endStr < todayStr
    : false;

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          onClick={() => navigate("customers")}
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">
            {customer.name}
          </h2>
          {customer.phone && (
            <div className="flex items-center gap-1 mt-0.5">
              <Phone className="size-3 text-foreground/60" />
              <span className="text-xs text-foreground/60">
                {customer.phone}
              </span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          onClick={() => setEditDialogOpen(true)}
          aria-label="Edit customer"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          onClick={() => setDeleteDialogOpen(true)}
          aria-label="Delete customer"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* ─── Badges ──────────────────────────────────────────────── */}
      <div className="px-4 flex items-center gap-1.5 flex-wrap">
        <Badge
          variant={billingBadgeVariant(customer.billingType)}
          className="text-[10px] px-1.5 py-0 h-5"
        >
          {BILLING_TYPE_LABELS[customer.billingType]}
        </Badge>
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 h-5 ${milkBadgeClass(customer.milkType)}`}
        >
          {MILK_TYPES[customer.milkType]}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
          <ShiftIcon shift={customer.shift} className="size-3" />
          {SHIFT_LABELS[customer.shift]}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800">
          <CalendarDays className="size-3" />
          {format(parseISO(getCustomerStartDate(customer).split('T')[0]), "d MMM yyyy")} se
        </Badge>
      </div>

      {/* ─── Billing Cycle Summary Card ─────────────────────────── */}
      {cycleStats && billingCycle && (
        <div className="px-4 mt-3">
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarDays className="size-4 text-foreground/60" />
                Billing Cycle — {format(billingCycle.start, "d MMM yyyy")} to {format(billingCycle.end, "d MMM yyyy")}
              </CardTitle>
              {!isViewingCurrentCycle && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 h-6 text-[10px] w-full"
                  onClick={() => setBillingCycle(getBillingCycle(getCustomerStartDate(customer)))}
                >
                  Back to Current Cycle
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              {/* Total Liters - Prominent display */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
                <div className="size-10 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shrink-0">
                  <Droplets className="size-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-sky-700 dark:text-sky-300 font-medium">
                    Total Milk ({cycleStats.deliveredDays} din delivery)
                  </p>
                  <p className="text-xl font-bold text-sky-800 dark:text-sky-200">
                    {cycleStats.totalLiters.toFixed(1)} Liters
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-foreground/60">
                    {cycleStats.elapsedDays}/{cycleStats.totalCycleDays} days
                  </p>
                  {cycleStats.skippedDays > 0 && (
                    <p className="text-[9px] text-red-500">
                      {cycleStats.skippedDays} skipped
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                    <IndianRupee className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-foreground/60 font-medium">
                      Is Period ka Bill
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(cycleStats.totalAmount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                    <CreditCard className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-foreground/60 font-medium">
                      Payment Done
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(cycleStats.totalPayments)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Carry-forward row */}
              {cycleStats.carryForward > 0 && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800">
                  <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                    <Info className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-medium">
                        Pichle Month ka Baki (Carry-Forward)
                      </p>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">
                        +{formatCurrency(cycleStats.carryForward)}
                      </p>
                    </div>
                    <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">
                      Pichle deliveries: {formatCurrency(cycleStats.previousTotalDeliveries)} | Payments: {formatCurrency(cycleStats.previousTotalPayments)}
                    </p>
                  </div>
                </div>
              )}

              {/* Net Balance - simple row */}
              <Separator />
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-medium text-foreground/60">
                  Net Balance
                </p>
                <p
                  className={`text-sm font-bold ${
                    cycleStats.netBalance > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {cycleStats.netBalance > 0 ? "Dena hai: " : "Clear: "}{formatCurrency(Math.abs(cycleStats.netBalance))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Billing Cycle Calendar ──────────────────────────────── */}
      <div className="px-4 mt-4">
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarDays className="size-4 text-foreground/60" />
                Delivery Calendar
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={prevCycle}
                  disabled={!billingCycle || !customer || billingCycle.startStr <= (() => { const p = extractDateParts(getCustomerStartDate(customer)); return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`; })()}
                  aria-label="Previous billing cycle"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs font-medium min-w-[10rem] text-center">
                  {billingCycle
                    ? `${format(billingCycle.start, "d MMM")} - ${format(billingCycle.end, "d MMM yyyy")}`
                    : "Loading..."}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={nextCycle}
                  aria-label="Next billing cycle"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            {/* Month-wise quick navigation */}
            {billingCycleList.length > 1 && (
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {billingCycleList.map((cycle) => (
                  <button
                    key={cycle.startStr}
                    onClick={() => setBillingCycle({ start: cycle.start, end: cycle.end, startStr: cycle.startStr, endStr: cycle.endStr })}
                    className={`text-[9px] px-2 py-1 rounded-full border transition-colors ${
                      billingCycle && billingCycle.startStr === cycle.startStr
                        ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300 font-semibold"
                        : "bg-muted/50 border-muted text-foreground/60 hover:bg-muted"
                    }`}
                  >
                    {format(cycle.start, "d MMM")} - {format(cycle.end, "d MMM")}
                  </button>
                ))}
              </div>
            )}

            {/* Bill Ready indicator */}
            {isCycleCompleted && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 px-3 py-2">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex-1">
                  Bill Ready - Cycle completed
                </span>
                <Button
                  size="sm"
                  className="h-6 text-[10px] px-2 btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                  onClick={() => setShareBillDialogOpen(true)}
                >
                  <Share2 className="size-3 mr-1" />
                  Share Now
                </Button>
              </div>
            )}


          </CardHeader>
          <CardContent className="px-4 pb-3">
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map((d, i) => (
                <div
                  key={i}
                  className="text-center text-[10px] font-medium text-muted-foreground py-0.5"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {calendarDates.length > 0 ? (
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset (day-of-week of cycle start) */}
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[2.5rem]" />
                ))}

                {/* Date cells */}
                {calendarDates.map((dateStr) => {
                  const dayDeliveries = deliveriesByDate[dateStr] ?? [];
                  const isDateToday = dateStr === todayStr;
                  const isDateFuture = dateStr > todayStr;
                  return (
                    <CalendarCell
                      key={dateStr}
                      dateStr={dateStr}
                      deliveries={dayDeliveries}
                      isInCycle={true}
                      isToday={isDateToday}
                      isFuture={isDateFuture}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 text-foreground/60 animate-spin" />
                <span className="ml-2 text-sm text-foreground/60">Loading calendar...</span>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 justify-center flex-wrap">
              <div className="flex items-center gap-1">
                <div className="size-2.5 rounded-sm bg-emerald-400" />
                <span className="text-[10px] text-foreground/60">Delivered</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-2.5 rounded-sm bg-red-400" />
                <span className="text-[10px] text-foreground/60">Skipped</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
                <span className="text-[10px] text-foreground/60">No delivery</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-2.5 rounded-sm border border-dashed border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-700" />
                <span className="text-[10px] text-foreground/60">Pending</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-2.5 rounded-sm ring-1 ring-amber-400" />
                <span className="text-[10px] text-foreground/60">Today</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Share Bill Button ──────────────────────────────────── */}
      <div className="px-4 mt-4">
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
          onClick={() => setShareBillDialogOpen(true)}
        >
          <Share2 className="size-4 mr-2" />
          Share Bill
        </Button>
      </div>

      {/* ─── Tabbed Sections ─────────────────────────────────────── */}
      <div className="px-4 mt-4">
        <Tabs defaultValue="deliveries">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="deliveries" className="gap-1 text-xs">
              <Truck className="size-3.5" />
              Deliveries
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1 text-xs">
              <CreditCard className="size-3.5" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* ─── Deliveries Tab ────────────────────────────────── */}
          <TabsContent value="deliveries">
            <div className="flex items-center justify-between mt-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                Recent Deliveries
              </h3>
              <span className="text-xs text-foreground/60">
                {customerDeliveries.length} total
              </span>
            </div>

            {customerDeliveries.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Truck className="size-8 text-foreground/60" />
                <p className="text-sm text-foreground/60">
                  No deliveries recorded yet
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {customerDeliveries
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 30)
                    .map((delivery) => (
                      <div
                        key={delivery.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div
                          className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                            delivery.status === "delivered"
                              ? "bg-emerald-100 dark:bg-emerald-900/40"
                              : delivery.status === "skipped"
                                ? "bg-amber-100 dark:bg-amber-900/40"
                                : "bg-red-100 dark:bg-red-900/40"
                          }`}
                        >
                          {delivery.status === "delivered" ? (
                            <CheckCircle2 className="size-4 text-emerald-600" />
                          ) : delivery.status === "skipped" ? (
                            <MinusCircle className="size-4 text-amber-500" />
                          ) : (
                            <XCircle className="size-4 text-red-500" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              {formatDate(delivery.date)}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {formatCurrency(delivery.totalAmount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-foreground/60">
                              {delivery.quantity}L @ {formatCurrency(delivery.pricePerL)}/L
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4"
                            >
                              {SHIFT_LABELS[delivery.shift]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 h-4 ${milkBadgeClass(delivery.milkType)}`}
                            >
                              {MILK_TYPES[delivery.milkType]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ─── Payments Tab ──────────────────────────────────── */}
          <TabsContent value="payments">
            <div className="flex items-center justify-between mt-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                Recent Payments
              </h3>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                onClick={() => setPaymentDialogOpen(true)}
              >
                <Plus className="size-3 mr-1" />
                Add Payment
              </Button>
            </div>

            {customerPayments.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <CreditCard className="size-8 text-foreground/60" />
                <p className="text-sm text-foreground/60">
                  No payments recorded yet
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {customerPayments
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 30)
                    .map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                          <CreditCard className="size-4 text-emerald-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              {formatDate(payment.date)}
                            </span>
                            <span className="text-sm font-semibold text-emerald-600">
                              +{formatCurrency(payment.amount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4"
                            >
                              {PAYMENT_MODES[payment.paymentMode] ??
                                payment.paymentMode}
                            </Badge>
                            {payment.notes && (
                              <span className="text-xs text-foreground/60 truncate">
                                {payment.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Floating Action Buttons ─────────────────────────────── */}
      <div className="fixed bottom-24 right-5 z-30 flex flex-col gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setPaymentDialogOpen(true)}
          className="size-12 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:bg-emerald-700 transition-colors"
          aria-label="Add Payment"
        >
          <Plus className="size-5" />
        </motion.button>
      </div>

      {/* ─── Dialogs ─────────────────────────────────────────────── */}
      {selectedCustomerId && (
        <AddPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          customerId={selectedCustomerId}
        />
      )}

      <EditCustomerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        customer={customer}
      />

      {/* Delete Customer Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Delete Customer
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Kya aap <strong>{customer.name}</strong> ko delete karna chahte hain? Yeh action undo nahi ho sakta.
                </p>
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300">
                    Is customer ke saare deliveries, payments, aur ledger records bhi delete ho jayenge:
                  </p>
                  <ul className="text-xs text-red-600 dark:text-red-400 mt-1 ml-3 list-disc">
                    <li>{customerDeliveries.length} delivery records</li>
                    <li>{customerPayments.length} payment records</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteCustomer(customer.id);
                  setDeleteDialogOpen(false);
                  navigate("customers");
                } catch {
                  // error handled in store
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Customer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {billingCycle && cycleStats && (
        <ShareBillDialog
          open={shareBillDialogOpen}
          onOpenChange={setShareBillDialogOpen}
          customer={customer}
          customerDeliveries={customerDeliveries}
          customerPayments={customerPayments}
          billingCycle={billingCycle}
          cycleStats={cycleStats}
        />
      )}
    </div>
  );
}
