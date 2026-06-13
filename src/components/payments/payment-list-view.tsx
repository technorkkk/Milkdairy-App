"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import {
  Plus,
  IndianRupee,
  CalendarDays,
  CreditCard,
  Search,
  Loader2,
  ChevronRight,
  Banknote,
  Smartphone,
  Building2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { paymentSchema, type PaymentInput } from "@/lib/validators";
import { formatCurrency } from "@/lib/accounting";
import { PAYMENT_MODES, formatDate, getTodayStr, cn } from "@/lib/utils";
import { usePaymentStore } from "@/stores/payment-store";
import { useCustomerStore } from "@/stores/customer-store";
import { useDairyStore } from "@/stores/dairy-store";
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

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type DateRange = "week" | "month" | "custom";

const paymentModeIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-3.5 h-3.5" />,
  upi: <Smartphone className="w-3.5 h-3.5" />,
  bank: <Building2 className="w-3.5 h-3.5" />,
  other: <CreditCard className="w-3.5 h-3.5" />,
};

export function PaymentListView() {
  const { dairy } = useDairyStore();
  const { payments, isLoading, loadPayments, addPayment, deletePayment } = usePaymentStore();
  const { customers, loadCustomers } = useCustomerStore();

  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dairyId = dairy?.id || "";

  // Load data on mount
  useEffect(() => {
    if (dairyId) {
      loadCustomers(dairyId);
    }
  }, [dairyId, loadCustomers]);

  // Date range calculation
  const dateRangeValues = useMemo(() => {
    const now = new Date();
    if (dateRange === "week") {
      return {
        from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    }
    if (dateRange === "month") {
      return {
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    }
    return {
      from: customFrom ? format(customFrom, "yyyy-MM-dd") : undefined,
      to: customTo ? format(customTo, "yyyy-MM-dd") : undefined,
    };
  }, [dateRange, customFrom, customTo]);

  // Load payments when range changes
  useEffect(() => {
    if (dairyId) {
      loadPayments(dairyId, dateRangeValues.from, dateRangeValues.to);
    }
  }, [dairyId, dateRangeValues.from, dateRangeValues.to, loadPayments]);

  // Form setup
  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      customerId: "",
      amount: 0,
      paymentMode: "cash",
      date: getTodayStr(),
      notes: "",
      receiptNo: "",
    },
  });

  const onFormSubmit = useCallback(
    async (data: PaymentInput) => {
      if (!dairyId) return;
      setSubmitting(true);
      try {
        await addPayment(data);
        toast.success("Payment recorded successfully");
        setDialogOpen(false);
        form.reset({
          customerId: "",
          amount: 0,
          paymentMode: "cash",
          date: getTodayStr(),
          notes: "",
          receiptNo: "",
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to record payment");
      } finally {
        setSubmitting(false);
      }
    },
    [dairyId, addPayment, form]
  );

  // Filter payments by search
  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter((p) => {
      const customer = customers.find((c) => c.id === p.customerId);
      const name = customer?.name?.toLowerCase() || "";
      return (
        name.includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        p.receiptNo?.toLowerCase().includes(q) ||
        PAYMENT_MODES[p.paymentMode]?.toLowerCase().includes(q)
      );
    });
  }, [payments, customers, searchQuery]);

  // Totals
  const totalAmount = useMemo(
    () => filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    [filteredPayments]
  );

  const getCustomerName = useCallback(
    (id: string) => customers.find((c) => c.id === id)?.name || "Unknown",
    [customers]
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Payments</h2>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(totalAmount)} total &middot; {filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2">
              <Plus className="w-4 h-4" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Add a new payment from a customer.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers
                            .filter((c) => c.isActive)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Mode *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PAYMENT_MODES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                {paymentModeIcons[key]}
                                {label}
                              </span>
                            </SelectItem>
                          ))}
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
                      <FormLabel>Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(new Date(field.value), "dd MMM yyyy") : "Pick a date"}
                              <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receiptNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt No.</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional receipt number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional notes" className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                    disabled={submitting}
                  >
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Record Payment
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {(["week", "month", "custom"] as DateRange[]).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? "default" : "ghost"}
              size="sm"
              className={cn(
                "text-xs px-3",
                dateRange === range && "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
              onClick={() => setDateRange(range)}
            >
              {range === "week" ? "This Week" : range === "month" ? "This Month" : "Custom"}
            </Button>
          ))}
        </div>

        {dateRange === "custom" && (
          <div className="flex gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {customFrom ? format(customFrom, "dd MMM") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-xs">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {customTo ? format(customTo, "dd MMM") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && payments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <IndianRupee className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No payments yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Record your first payment to start tracking customer transactions.
          </p>
        </div>
      )}

      {/* Search No Results */}
      {!isLoading && payments.length > 0 && filteredPayments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Search className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No payments match your search.</p>
        </div>
      )}

      {/* Payment Cards */}
      {!isLoading && filteredPayments.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredPayments.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Card className="hover:shadow-md transition-shadow group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground truncate">
                            {getCustomerName(payment.customerId)}
                          </span>
                          <Badge
                            variant="secondary"
                            className="shrink-0 gap-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            {paymentModeIcons[payment.paymentMode]}
                            {PAYMENT_MODES[payment.paymentMode] || payment.paymentMode}
                          </Badge>
                        </div>
                        <p className="text-lg font-bold text-emerald-600">
                          {formatCurrency(payment.amount)}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{formatDate(payment.date)}</span>
                          {payment.receiptNo && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              {payment.receiptNo}
                            </span>
                          )}
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {payment.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(payment.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Payment Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This will update the customer's balance. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                setIsDeleting(true);
                try {
                  await deletePayment(deleteTarget);
                  toast.success("Payment deleted");
                  setDeleteTarget(null);
                } catch {
                  toast.error("Failed to delete payment");
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
