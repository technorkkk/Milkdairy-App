"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import {
  Plus,
  Receipt,
  CalendarDays,
  Search,
  Loader2,
  Wheat,
  Fuel,
  UserCheck,
  Wrench,
  Truck,
  HelpCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { expenseSchema, type ExpenseInput } from "@/lib/validators";
import { formatCurrency } from "@/lib/accounting";
import { EXPENSE_CATEGORIES, formatDate, getTodayStr, cn } from "@/lib/utils";
import { useExpenseStore } from "@/stores/expense-store";
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

const categoryIcons: Record<string, React.ReactNode> = {
  feed: <Wheat className="w-3.5 h-3.5" />,
  fuel: <Fuel className="w-3.5 h-3.5" />,
  salary: <UserCheck className="w-3.5 h-3.5" />,
  maintenance: <Wrench className="w-3.5 h-3.5" />,
  transport: <Truck className="w-3.5 h-3.5" />,
  other: <HelpCircle className="w-3.5 h-3.5" />,
};

const categoryColors: Record<string, string> = {
  feed: "bg-amber-50 text-amber-700 border-amber-200",
  fuel: "bg-red-50 text-red-700 border-red-200",
  salary: "bg-blue-50 text-blue-700 border-blue-200",
  maintenance: "bg-purple-50 text-purple-700 border-purple-200",
  transport: "bg-cyan-50 text-cyan-700 border-cyan-200",
  other: "bg-gray-50 text-gray-700 border-gray-200",
};

export function ExpenseListView() {
  const { dairy } = useDairyStore();
  const { expenses, isLoading, loadExpenses, addExpense, deleteExpense } = useExpenseStore();

  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dairyId = dairy?.id || "";

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

  // Load expenses when range changes
  useEffect(() => {
    if (dairyId) {
      loadExpenses(dairyId, dateRangeValues.from, dateRangeValues.to);
    }
  }, [dairyId, dateRangeValues.from, dateRangeValues.to, loadExpenses]);

  // Form setup
  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      category: "other",
      amount: 0,
      description: "",
      date: getTodayStr(),
    },
  });

  const onFormSubmit = useCallback(
    async (data: ExpenseInput) => {
      if (!dairyId) return;
      setSubmitting(true);
      try {
        await addExpense({ ...data, dairyId });
        toast.success("Expense recorded successfully");
        setDialogOpen(false);
        form.reset({
          category: "other",
          amount: 0,
          description: "",
          date: getTodayStr(),
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to record expense");
      } finally {
        setSubmitting(false);
      }
    },
    [dairyId, addExpense, form]
  );

  // Filter expenses by search
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(
      (e) =>
        e.description?.toLowerCase().includes(q) ||
        EXPENSE_CATEGORIES[e.category]?.toLowerCase().includes(q)
    );
  }, [expenses, searchQuery]);

  // Category summary
  const categorySummary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of filteredExpenses) {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    }
    return Object.entries(map)
      .map(([key, total]) => ({ key, label: EXPENSE_CATEGORIES[key] || key, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(totalAmount)} total &middot; {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Expense</DialogTitle>
              <DialogDescription>Add a new expense entry.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                {categoryIcons[key]}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional description" className="resize-none" {...field} />
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
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                  >
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Record Expense
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
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Category Summary */}
      {categorySummary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {categorySummary.map(({ key, label, total }) => (
            <Card key={key} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant="secondary" className={cn("text-xs gap-1", categoryColors[key])}>
                    {categoryIcons[key]}
                    {label}
                  </Badge>
                </div>
                <p className="text-sm font-bold text-foreground">{formatCurrency(total)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && expenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No expenses yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Record your first expense to start tracking your dairy&apos;s spending.
          </p>
        </div>
      )}

      {/* Search No Results */}
      {!isLoading && expenses.length > 0 && filteredExpenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Search className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No expenses match your search.</p>
        </div>
      )}

      {/* Expense Cards */}
      {!isLoading && filteredExpenses.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredExpenses.map((expense, index) => (
              <motion.div
                key={expense.id}
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
                          <Badge
                            variant="secondary"
                            className={cn("shrink-0 gap-1 text-xs", categoryColors[expense.category])}
                          >
                            {categoryIcons[expense.category]}
                            {EXPENSE_CATEGORIES[expense.category] || expense.category}
                          </Badge>
                        </div>
                        <p className="text-lg font-bold text-destructive">
                          {formatCurrency(expense.amount)}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{formatDate(expense.date)}</span>
                        </div>
                        {expense.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {expense.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(expense.id);
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

      {/* Delete Expense Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                setIsDeleting(true);
                try {
                  await deleteExpense(deleteTarget);
                  toast.success("Expense deleted");
                  setDeleteTarget(null);
                } catch {
                  toast.error("Failed to delete expense");
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
