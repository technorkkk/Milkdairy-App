"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Package,
  Loader2,
  Search,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Milk,
  Wheat,
  PackageCheck,
  Cog,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

import { inventorySchema, type InventoryInput } from "@/lib/validators";
import { formatCurrency } from "@/lib/accounting";
import { cn } from "@/lib/utils";
import { useInventoryStore, type InventoryItem } from "@/stores/inventory-store";
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

const INVENTORY_CATEGORY_LABELS: Record<string, string> = {
  milk: "Milk",
  feed: "Feed",
  supply: "Supply",
  equipment: "Equipment",
  other: "Other",
};

const categoryIcons: Record<string, React.ReactNode> = {
  milk: <Milk className="w-3.5 h-3.5" />,
  feed: <Wheat className="w-3.5 h-3.5" />,
  supply: <PackageCheck className="w-3.5 h-3.5" />,
  equipment: <Cog className="w-3.5 h-3.5" />,
  other: <HelpCircle className="w-3.5 h-3.5" />,
};

const categoryColors: Record<string, string> = {
  milk: "bg-emerald-50 text-emerald-700 border-emerald-200",
  feed: "bg-amber-50 text-amber-700 border-amber-200",
  supply: "bg-blue-50 text-blue-700 border-blue-200",
  equipment: "bg-purple-50 text-purple-700 border-purple-200",
  other: "bg-gray-50 text-gray-700 border-gray-200",
};

const unitLabels: Record<string, string> = {
  litre: "L",
  kg: "kg",
  piece: "pcs",
  packet: "pkt",
};

function isLowStock(item: InventoryItem): boolean {
  return item.minStock > 0 && item.quantity <= item.minStock;
}

export function InventoryListView() {
  const { dairy } = useDairyStore();
  const { inventoryItems, isLoading, loadInventory, addInventoryItem, deleteInventoryItem } =
    useInventoryStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const dairyId = dairy?.id || "";

  // Load inventory
  useEffect(() => {
    if (dairyId) {
      loadInventory(dairyId);
    }
  }, [dairyId, loadInventory]);

  // Form setup
  const form = useForm<InventoryInput>({
    resolver: zodResolver(inventorySchema) as any,
    defaultValues: {
      name: "",
      category: "other",
      quantity: 0,
      unit: "piece",
      minStock: 0,
      pricePerUnit: 0,
    },
  });

  const onFormSubmit = useCallback(
    async (data: InventoryInput) => {
      if (!dairyId) return;
      setSubmitting(true);
      try {
        await addInventoryItem({ ...data, dairyId });
        toast.success("Inventory item added successfully");
        setDialogOpen(false);
        form.reset({
          name: "",
          category: "other",
          quantity: 0,
          unit: "piece",
          minStock: 0,
          pricePerUnit: 0,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add item");
      } finally {
        setSubmitting(false);
      }
    },
    [dairyId, addInventoryItem, form]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteInventoryItem(id);
        toast.success("Item deleted successfully");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete item");
      } finally {
        setDeletingId(null);
      }
    },
    [deleteInventoryItem]
  );

  // Filter items
  const filteredItems = useMemo(() => {
    let items = inventoryItems;
    if (filterCategory !== "all") {
      items = items.filter((i) => i.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          INVENTORY_CATEGORY_LABELS[i.category]?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [inventoryItems, filterCategory, searchQuery]);

  // Stats
  const lowStockCount = useMemo(
    () => inventoryItems.filter(isLowStock).length,
    [inventoryItems]
  );

  const totalValue = useMemo(
    () =>
      inventoryItems.reduce(
        (sum, item) => sum + item.quantity * item.pricePerUnit,
        0
      ),
    [inventoryItems]
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Inventory</h2>
          <p className="text-sm text-muted-foreground">
            {inventoryItems.length} item{inventoryItems.length !== 1 ? "s" : ""} &middot;{" "}
            {formatCurrency(totalValue)} total value
            {lowStockCount > 0 && (
              <span className="text-amber-600 ml-1">
                &middot; {lowStockCount} low stock
              </span>
            )}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>Add a new item to your inventory.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Cattle Feed Premium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          {Object.entries(INVENTORY_CATEGORY_LABELS).map(([key, label]) => (
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

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(unitLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {key.charAt(0).toUpperCase() + key.slice(1)} ({label})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Stock Level</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pricePerUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price/Unit (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                    Add Item
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 overflow-x-auto">
          <Button
            variant={filterCategory === "all" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "text-xs px-3 shrink-0",
              filterCategory === "all" && "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
            onClick={() => setFilterCategory("all")}
          >
            All
          </Button>
          {Object.entries(INVENTORY_CATEGORY_LABELS).map(([key, label]) => (
            <Button
              key={key}
              variant={filterCategory === key ? "default" : "ghost"}
              size="sm"
              className={cn(
                "text-xs px-3 shrink-0 gap-1",
                filterCategory === key && "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
              onClick={() => setFilterCategory(key)}
            >
              {categoryIcons[key]}
              {label}
            </Button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{lowStockCount}</span> item{lowStockCount !== 1 ? "s" : ""} below minimum stock level
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && inventoryItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No inventory items</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Add your first inventory item to start tracking stock levels and values.
          </p>
        </div>
      )}

      {/* Search No Results */}
      {!isLoading && inventoryItems.length > 0 && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Search className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No items match your filters.</p>
        </div>
      )}

      {/* Inventory Cards */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => {
              const low = isLowStock(item);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <Card
                    className={cn(
                      "hover:shadow-md transition-shadow cursor-pointer group",
                      low && "border-amber-300 bg-amber-50/30"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground truncate">
                              {item.name}
                            </span>
                            {low && (
                              <Badge
                                variant="secondary"
                                className="shrink-0 gap-1 text-xs bg-amber-100 text-amber-700 border-amber-300"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Low
                              </Badge>
                            )}
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn("gap-1 text-xs mb-2", categoryColors[item.category])}
                          >
                            {categoryIcons[item.category]}
                            {INVENTORY_CATEGORY_LABELS[item.category] || item.category}
                          </Badge>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-foreground">
                              {item.quantity}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {unitLabels[item.unit] || item.unit}
                            </span>
                          </div>
                          {item.minStock > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Min: {item.minStock} {unitLabels[item.unit] || item.unit}
                            </p>
                          )}
                          {item.pricePerUnit > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatCurrency(item.pricePerUnit)}/{unitLabels[item.unit] || item.unit} &middot;{" "}
                              Total: {formatCurrency(item.quantity * item.pricePerUnit)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                disabled={deletingId === item.id}
                              >
                                {deletingId === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{item.name}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(item.id)}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
    </div>
  );
}
