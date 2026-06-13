"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Plus,
  MilkOff,
  Loader2,
  CalendarDays,
  Sun,
  Moon,
  SunMoon,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { milkRateSchema, type MilkRateInput } from "@/lib/validators";
import { formatCurrency } from "@/lib/accounting";
import { MILK_TYPES, SHIFT_LABELS, formatDate, getTodayStr, cn } from "@/lib/utils";
import { useInventoryStore } from "@/stores/inventory-store";
import { useDairyStore } from "@/stores/dairy-store";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const shiftIcons: Record<string, React.ReactNode> = {
  morning: <Sun className="w-3.5 h-3.5" />,
  evening: <Moon className="w-3.5 h-3.5" />,
  both: <SunMoon className="w-3.5 h-3.5" />,
};

const milkTypeColors: Record<string, string> = {
  cow: "bg-emerald-50 text-emerald-700 border-emerald-200",
  buffalo: "bg-amber-50 text-amber-700 border-amber-200",
  mixed: "bg-purple-50 text-purple-700 border-purple-200",
};

export function MilkRateView() {
  const { dairy } = useDairyStore();
  const { milkRates, isLoading, loadMilkRates, addMilkRate, deleteMilkRate } = useInventoryStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const dairyId = dairy?.id || "";

  // Load milk rates
  useEffect(() => {
    if (dairyId) {
      loadMilkRates(dairyId);
    }
  }, [dairyId, loadMilkRates]);

  // Form setup
  const form = useForm<MilkRateInput>({
    resolver: zodResolver(milkRateSchema) as any,
    defaultValues: {
      milkType: "cow",
      pricePerL: 0,
      shift: "both",
      effectiveFrom: getTodayStr(),
    },
  });

  const onFormSubmit = useCallback(
    async (data: MilkRateInput) => {
      if (!dairyId) return;
      setSubmitting(true);
      try {
        await addMilkRate({ ...data, dairyId });
        toast.success("Milk rate added successfully");
        setDialogOpen(false);
        form.reset({
          milkType: "cow",
          pricePerL: 0,
          shift: "both",
          effectiveFrom: getTodayStr(),
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add rate");
      } finally {
        setSubmitting(false);
      }
    },
    [dairyId, addMilkRate, form]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteMilkRate(id);
        toast.success("Rate deleted successfully");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete rate");
      } finally {
        setDeletingId(null);
      }
    },
    [deleteMilkRate]
  );

  // Group rates by milk type for a nicer display
  const ratesByType = useMemo(() => {
    const map: Record<string, typeof milkRates> = {};
    for (const rate of milkRates) {
      if (!rate || !rate.milkType) continue;
      if (!map[rate.milkType]) map[rate.milkType] = [];
      map[rate.milkType].push(rate);
    }
    // Sort each group by effectiveFrom desc
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
      );
    }
    return map;
  }, [milkRates]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Milk Rates</h2>
          <p className="text-sm text-muted-foreground">
            {milkRates.length} rate{milkRates.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2">
              <Plus className="w-4 h-4" />
              Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Milk Rate</DialogTitle>
              <DialogDescription>Set a new price per litre for milk.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="milkType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Milk Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select milk type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(MILK_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
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
                  name="pricePerL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Litre (₹) *</FormLabel>
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
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(SHIFT_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                {shiftIcons[key]}
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
                  name="effectiveFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective From *</FormLabel>
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
                    Add Rate
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && milkRates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <MilkOff className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No milk rates configured</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Add your first milk rate to set the price per litre for different milk types.
          </p>
        </div>
      )}

      {/* Rate Cards grouped by milk type */}
      {!isLoading && milkRates.length > 0 && (
        <div className="space-y-6">
          {Object.entries(ratesByType).map(([milkType, rates]) => (
            <div key={milkType}>
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant="secondary"
                  className={cn("gap-1 text-sm", milkTypeColors[milkType])}
                >
                  {MILK_TYPES[milkType] || milkType}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {rates.length} rate{rates.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {rates.map((rate, index) => (
                    <motion.div
                      key={rate.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(rate.pricePerL)}
                                <span className="text-sm font-normal text-muted-foreground">/L</span>
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge
                                  variant="outline"
                                  className="gap-1 text-xs"
                                >
                                  {shiftIcons[rate.shift]}
                                  {SHIFT_LABELS[rate.shift] || rate.shift}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Effective from {formatDate(rate.effectiveFrom)}
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  disabled={deletingId === rate.id}
                                >
                                  {deletingId === rate.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Rate</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this {MILK_TYPES[rate.milkType]} rate of {formatCurrency(rate.pricePerL)}/L? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(rate.id)}
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
