"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, addDays } from "date-fns";
import { toast } from "sonner";
import {
  Search,
  Plus,
  UserPlus,
  Phone,
  Wallet,
  IndianRupee,
  Sun,
  Moon,
  Sunrise,
  Loader2,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  History,
  AlertCircle,
  Trash2,
} from "lucide-react";

import { customerSchema, type CustomerInput } from "@/lib/validators";
import { useCustomerStore } from "@/stores/customer-store";
import { useDairyStore } from "@/stores/dairy-store";
import { useUIStore } from "@/stores/ui-store";
import { useDeliveryStore } from "@/stores/delivery-store";
import { useInventoryStore } from "@/stores/inventory-store";
import { formatCurrency } from "@/lib/accounting";
import {
  getInitials,
  MILK_TYPES,
  SHIFT_LABELS,
  BILLING_TYPE_LABELS,
  formatDateForInput,
  getDatesInMonth,
} from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Shift Icon Helper ─────────────────────────────────────────────
function ShiftIcon({ shift }: { shift: string }) {
  switch (shift) {
    case "morning":
      return <Sun className="size-3.5 text-amber-500" />;
    case "evening":
      return <Moon className="size-3.5 text-indigo-400" />;
    case "both":
      return <Sunrise className="size-3.5 text-emerald-500" />;
    default:
      return null;
  }
}

// ─── Badge Color Helpers ───────────────────────────────────────────
function billingTypeBadgeVariant(
  type: string
): "default" | "secondary" | "destructive" | "outline" {
  return type === "prepaid" ? "default" : "secondary";
}

function milkTypeBadgeClass(type: string): string {
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

// ─── Customer Card ─────────────────────────────────────────────────
function CustomerCard({
  customer,
  onSelect,
  onDelete,
}: {
  customer: ReturnType<typeof useCustomerStore.getState>["customers"][number];
  onSelect: () => void;
  onDelete: (customer: ReturnType<typeof useCustomerStore.getState>["customers"][number]) => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const balance =
    customer.billingType === "prepaid"
      ? customer.walletBalance
      : customer.totalOutstanding;

  const isPositiveBalance = balance >= 0;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await onDelete(customer);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        <div
          className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md active:scale-[0.98] cursor-pointer"
          onClick={onSelect}
        >
          {/* Avatar */}
          <Avatar className="size-11 shrink-0">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate text-sm">
                {customer.name}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                <ShiftIcon shift={customer.shift} />
                <span className="text-xs text-foreground/60">
                  {SHIFT_LABELS[customer.shift]}
                </span>
              </div>
            </div>

            {customer.phone && (
              <div className="flex items-center gap-1 mt-0.5">
                <Phone className="size-3 text-foreground/60" />
                <span className="text-xs text-foreground/60 truncate">
                  {customer.phone}
                </span>
              </div>
            )}

            {/* Badges + Qty row */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge
                variant={billingTypeBadgeVariant(customer.billingType)}
                className="text-[10px] px-1.5 py-0 h-5"
              >
                {BILLING_TYPE_LABELS[customer.billingType]}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-5 ${milkTypeBadgeClass(customer.milkType)}`}
              >
                {MILK_TYPES[customer.milkType]}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-foreground/60">
                {customer.defaultQuantity}L/day
              </Badge>
            </div>
          </div>

          {/* Balance + Delete */}
          <div className="flex flex-col items-end shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-foreground/60 hover:text-destructive -mr-1 -mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
            <span className="text-[10px] text-foreground/60 uppercase tracking-wide">
              {customer.billingType === "prepaid" ? "Wallet" : "Due"}
            </span>
            <div className="flex items-center gap-0.5 mt-0.5">
              {customer.billingType === "prepaid" ? (
                <Wallet className="size-3 text-emerald-600" />
              ) : (
                <IndianRupee className="size-3 text-red-500" />
              )}
              <span
                className={`text-sm font-bold ${
                  customer.billingType === "prepaid"
                    ? isPositiveBalance
                      ? "text-emerald-600"
                      : "text-red-500"
                    : customer.totalOutstanding > 0
                      ? "text-red-500"
                      : "text-emerald-600"
                }`}
              >
                {formatCurrency(Math.abs(balance))}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{customer.name}</strong>? All their delivery records, payments, and ledger entries will also be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <><Loader2 className="size-4 animate-spin mr-2" />Deleting...</>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Absent Date Calendar ────────────────────────────────────────────
function AbsentDateCalendar({
  startDate,
  endDate,
  absentDates,
  onToggleAbsent,
}: {
  startDate: string;
  endDate: string;
  absentDates: Set<string>;
  onToggleAbsent: (date: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseISO(startDate);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  const calendarDates = useMemo(
    () => getDatesInMonth(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month]
  );

  const firstDayOffset = new Date(
    viewMonth.year,
    viewMonth.month,
    1
  ).getDay();

  const prevMonth = useCallback(() => {
    setViewMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((prev) => {
      const d = new Date(prev.year, prev.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  // Navigate to start date month when it changes
  useEffect(() => {
    const d = parseISO(startDate);
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [startDate]);

  const today = formatDateForInput();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground/60">
          Select absent dates (tap to mark)
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
          {absentDates.size} absent
        </Badge>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs font-semibold">
          {format(new Date(viewMonth.year, viewMonth.month, 1), "MMMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={nextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1">
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
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[2.25rem]" />
        ))}

        {calendarDates.map((dateStr) => {
          const isInRange =
            dateStr >= startDate && dateStr <= endDate;
          const isAbsent = absentDates.has(dateStr);
          const isToday = dateStr === today;
          const isFuture = dateStr > endDate;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!isInRange || isFuture}
              onClick={() => isInRange && !isFuture && onToggleAbsent(dateStr)}
              className={`flex flex-col items-center justify-center rounded-md p-0.5 min-h-[2.25rem] text-[11px] font-medium transition-all ${
                !isInRange || isFuture
                  ? "text-foreground/60/30 cursor-not-allowed"
                  : isAbsent
                    ? "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 ring-1 ring-red-300"
                    : isToday
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
              }`}
              title={`${format(parseISO(dateStr), "dd MMM yyyy")}${isAbsent ? " — Absent" : ""}`}
            >
              <span className="leading-none">{format(parseISO(dateStr), "d")}</span>
              {isAbsent && (
                <X className="size-2.5 text-red-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 justify-center pt-1">
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />
          <span className="text-[10px] text-foreground/60">Delivered</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-sm bg-red-100 border border-red-300" />
          <span className="text-[10px] text-foreground/60">Absent</span>
        </div>
      </div>
    </div>
  );
}

// ─── Add Customer Form (inside Sheet) ──────────────────────────────
function AddCustomerForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addCustomer, error: storeError, clearError } = useCustomerStore();
  const { dairy } = useDairyStore();
  const { bulkCreateDeliveries } = useDeliveryStore();
  const { getCurrentRate } = useInventoryStore();
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "past">("new");
  const [pastStartDate, setPastStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First of current month
    return formatDateForInput(d);
  });
  const [absentDates, setAbsentDates] = useState<Set<string>>(new Set());
  const [newStartDate, setNewStartDate] = useState(() => formatDateForInput());

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      billingType: "prepaid",
      milkType: "cow",
      defaultQuantity: 1,
      shift: "morning",
      openingBalance: 0,
      isActive: true,
    },
  });

  const today = formatDateForInput();

  const resetAndClose = useCallback(() => {
    form.reset({
      name: "",
      phone: "",
      address: "",
      billingType: "prepaid",
      milkType: "cow",
      defaultQuantity: 1,
      shift: "morning",
      openingBalance: 0,
      isActive: true,
    });
    setAbsentDates(new Set());
    setNewStartDate(() => formatDateForInput());
    setPastStartDate(() => {
      const d = new Date();
      d.setDate(1);
      return formatDateForInput(d);
    });
    setActiveTab("new");
    onOpenChange(false);
  }, [form, onOpenChange]);

  const toggleAbsentDate = useCallback((date: string) => {
    setAbsentDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }, []);

  const onSubmit = async (data: CustomerInput) => {
    if (!dairy?.id) return;
    // Guard: prevent double submission
    if (submitting) return;
    setSubmitting(true);
    clearError();
    try {
      // Set startDate: for past entry use the pastStartDate, for new use newStartDate
      const customerStartDate = activeTab === "past" && pastStartDate
        ? pastStartDate
        : newStartDate;

      const newCustomer = await addCustomer({
        ...data,
        startDate: customerStartDate,
        dairyId: dairy.id,
      });

      // If past entry mode, create bulk deliveries
      if (activeTab === "past" && pastStartDate) {
        const rate = getCurrentRate(data.milkType, data.shift);
        const pricePerL = rate?.pricePerL ?? 0;

        if (pricePerL > 0) {
          await bulkCreateDeliveries({
            customerId: newCustomer.id,
            startDate: pastStartDate,
            absentDates: Array.from(absentDates),
            shift: data.shift,
            milkType: data.milkType,
            pricePerL,
            defaultQuantity: data.defaultQuantity,
          });
        }
      }

      toast.success(`${data.name} added successfully`);
      resetAndClose();
    } catch (err) {
      // error is set in store, will show in the form
      console.error("Add customer error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate delivery count for past entry
  const pastDeliveryCount = useMemo(() => {
    if (activeTab !== "past" || !pastStartDate) return 0;
    let count = 0;
    const current = new Date(pastStartDate);
    const end = new Date(today);
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      if (!absentDates.has(dateStr)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }, [activeTab, pastStartDate, absentDates, today]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[92vh] flex flex-col p-0">
        {/* Fixed Header */}
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-emerald-600" />
            Add Customer
          </SheetTitle>
          <SheetDescription>
            Fill in the customer details. Name is required, rest are optional.
          </SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        <div className="px-4 shrink-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "new" | "past")}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="new" className="gap-1.5 text-xs">
                <UserPlus className="size-3.5" />
                New Customer
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-1.5 text-xs">
                <History className="size-3.5" />
                Past Entry
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Scrollable Form Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-4 pb-4">
            <Form {...form}>
              <form
                id="add-customer-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 pt-3"
              >
                {/* Past Entry Info Banner */}
                {activeTab === "past" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                          Past Entry Mode
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          For customers who were already receiving milk but not recorded. Add their details and select the start date. You can mark absent dates on the calendar below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Ramesh Kumar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone & Address in row */}
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

                {/* Billing Type - Radio */}
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
                            <RadioGroupItem value="prepaid" id="prepaid" />
                            <Label htmlFor="prepaid" className="cursor-pointer">
                              Prepaid
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="postpaid" id="postpaid" />
                            <Label htmlFor="postpaid" className="cursor-pointer">
                              Postpaid
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Milk Type & Shift in row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="milkType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Milk Type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
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
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
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

                {/* Default Quantity & Opening Balance in row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="defaultQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Qty (L)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="openingBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Balance (&#8377;)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Start Date - only in New Customer mode */}
                {activeTab === "new" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Start Date (Billing Cycle)
                    </Label>
                    <Input
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-[11px] text-foreground/60">
                      Is date se billing cycle calculate hoga. Example: 25 May se start = 25 May - 24 June.
                    </p>
                  </div>
                )}

                {/* ─── Past Entry Section ────────────────────────── */}
                {activeTab === "past" && (
                  <>
                    <Separator />

                    {/* Start Date */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Delivery Start Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={pastStartDate}
                        max={today}
                        onChange={(e) => {
                          setPastStartDate(e.target.value);
                          // Remove absent dates that are before the new start date
                          setAbsentDates((prev) => {
                            const next = new Set<string>();
                            for (const d of prev) {
                              if (d >= e.target.value && d <= today) {
                                next.add(d);
                              }
                            }
                            return next;
                          });
                        }}
                        className="w-full"
                      />
                      <p className="text-[11px] text-foreground/60">
                        From which date was this customer receiving milk?
                      </p>
                    </div>

                    {/* Absent Date Calendar */}
                    {pastStartDate && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Mark Absent Dates
                        </Label>
                        <div className="rounded-lg border p-3">
                          <AbsentDateCalendar
                            startDate={pastStartDate}
                            endDate={today}
                            absentDates={absentDates}
                            onToggleAbsent={toggleAbsentDate}
                          />
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {pastStartDate && (
                      <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground/60">Total days</span>
                          <span className="text-xs font-medium">
                            {Math.ceil(
                              (new Date(today).getTime() - new Date(pastStartDate).getTime()) /
                                (1000 * 60 * 60 * 24)
                            ) + 1}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground/60">Absent days</span>
                          <span className="text-xs font-medium text-red-600">
                            {absentDates.size}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">
                            Delivery entries to create
                          </span>
                          <Badge className="bg-emerald-600 text-white text-[10px] border-0">
                            {pastDeliveryCount}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </form>
            </Form>
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t bg-background px-4 py-3 flex flex-col gap-2">
          {storeError && (
            <div className="error-alert text-xs p-2">
              {storeError}
            </div>
          )}
          <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={resetAndClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-customer-form"
            className="flex-1 btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            {activeTab === "past" ? "Add with Past Entries" : "Add Customer"}
          </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Customer List View ───────────────────────────────────────
export function CustomerListView() {
  const { customers, loadCustomers, isLoading, deleteCustomer } = useCustomerStore();
  const { dairy } = useDairyStore();
  const { navigate } = useUIStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // Load customers on mount
  useEffect(() => {
    if (dairy?.id) {
      loadCustomers(dairy.id);
    }
  }, [dairy?.id, loadCustomers]);

  // Filtered list
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return customers.filter((c) => c.isActive);
    return customers.filter(
      (c) =>
        c.isActive &&
        (c.name.toLowerCase().includes(query) ||
          (c.phone && c.phone.toLowerCase().includes(query)))
    );
  }, [customers, searchQuery]);

  // Stats
  const totalCustomers = customers.filter((c) => c.isActive).length;

  const handleSelectCustomer = useCallback(
    (customerId: string) => {
      navigate("customer-detail", customerId);
    },
    [navigate]
  );

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Customers</h2>
            <p className="text-xs text-foreground/60 mt-0.5">
              {totalCustomers} active{totalCustomers !== 1 ? "s" : ""}
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
            <Users className="size-3.5" />
            {totalCustomers}
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/60" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-lg bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="flex-1 px-4 pb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="size-8 text-emerald-600 animate-spin" />
            <p className="text-sm text-foreground/60">
              Loading customers...
            </p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center">
              <Users className="size-8 text-foreground/60" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">
                {searchQuery ? "No customers found" : "No customers yet"}
              </p>
              <p className="text-sm text-foreground/60 mt-1">
                {searchQuery
                  ? "Try a different search term"
                  : "Add your first customer to get started"}
              </p>
            </div>
            {!searchQuery && (
              <Button
                onClick={() => setAddSheetOpen(true)}
                className="mt-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="size-4 mr-1.5" />
                Add Customer
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            <AnimatePresence mode="popLayout">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onSelect={() => handleSelectCustomer(customer.id)}
                  onDelete={async (c) => {
                    await deleteCustomer(c.id);
                    toast.success(`${c.name} deleted`);
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating Action Button - only show when there are customers */}
      {filteredCustomers.length > 0 && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAddSheetOpen(true)}
          className="fixed bottom-24 right-5 z-30 size-14 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 font-semibold flex items-center justify-center hover:bg-emerald-700 transition-colors"
          aria-label="Add Customer"
        >
          <Plus className="size-6" />
        </motion.button>
      )}

      {/* Add Customer Sheet */}
      <AddCustomerForm
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
      />
    </div>
  );
}
