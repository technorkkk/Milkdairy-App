"use client";

import { useState, useEffect, useCallback } from "react";
import { useCustomerStore } from "@/stores/customer-store";
import { useDeliveryStore } from "@/stores/delivery-store";
import { usePaymentStore } from "@/stores/payment-store";
import { useDairyStore } from "@/stores/dairy-store";
import { formatCurrency, roundTo2 } from "@/lib/accounting";
import { getTodayStr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { FileText, Download, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export function InvoiceBuilderView() {
  const { dairy } = useDairyStore();
  const { customers, loadCustomers } = useCustomerStore();
  const { deliveries, loadDeliveries } = useDeliveryStore();
  const { payments, loadPayments } = usePaymentStore();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>(getTodayStr());
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [customItems, setCustomItems] = useState<InvoiceItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`INV-${Date.now().toString(36).toUpperCase()}`);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (dairy) loadCustomers(dairy.id);
  }, [dairy, loadCustomers]);

  const loadInvoiceData = useCallback(async () => {
    if (!dairy || !selectedCustomerId || !dateFrom || !dateTo) return;
    await loadDeliveries(dairy.id, dateFrom, dateTo);
    await loadPayments(dairy.id, dateFrom, dateTo);

    const customerDeliveries = deliveries.filter(
      (d) => d.customerId === selectedCustomerId && d.status === "delivered"
    );
    const items: InvoiceItem[] = customerDeliveries.map((d) => ({
      id: d.id,
      description: `${d.milkType} milk - ${d.shift} (${d.date})`,
      quantity: d.quantity,
      rate: d.pricePerL,
      amount: roundTo2(d.quantity * d.pricePerL),
    }));
    setInvoiceItems(items);
  }, [dairy, selectedCustomerId, dateFrom, dateTo, deliveries, loadDeliveries, loadPayments]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const totalDeliveryAmount = roundTo2(invoiceItems.reduce((s, i) => s + i.amount, 0));
  const totalCustomAmount = roundTo2(customItems.reduce((s, i) => s + i.amount, 0));
  const grandTotal = roundTo2(totalDeliveryAmount + totalCustomAmount);

  const customerPayments = payments.filter((p) => p.customerId === selectedCustomerId);
  const totalPaid = roundTo2(customerPayments.reduce((s, p) => s + p.amount, 0));

  const addCustomItem = () => {
    setCustomItems([
      ...customItems,
      {
        id: `custom_${Date.now()}`,
        description: "",
        quantity: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const updateCustomItem = (id: string, field: string, value: string | number) => {
    setCustomItems(
      customItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.amount = roundTo2(Number(updated.quantity) * Number(updated.rate));
        }
        return updated;
      })
    );
  };

  const removeCustomItem = (id: string) => {
    setCustomItems(customItems.filter((i) => i.id !== id));
  };

  const generatePDF = async () => {
    if (!dairy || !selectedCustomer) return;
    setGenerating(true);
    try {
      const response = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dairy,
          customer: selectedCustomer,
          invoiceNumber,
          dateFrom,
          dateTo,
          deliveryItems: invoiceItems,
          customItems,
          totalDeliveryAmount,
          totalCustomAmount,
          grandTotal,
          totalPaid,
          balanceDue: roundTo2(grandTotal - totalPaid),
        }),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Invoice PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Invoice Builder</h2>
        <Button
          onClick={generatePDF}
          disabled={generating || !selectedCustomerId || invoiceItems.length === 0}
          className="btn-primary-prominent bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
          size="sm"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export PDF
        </Button>
      </div>

      {/* Invoice Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Invoice No.</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Customer</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <Button
            onClick={loadInvoiceData}
            disabled={!selectedCustomerId || !dateFrom}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Load Deliveries
          </Button>
        </CardContent>
      </Card>

      {/* Invoice Preview */}
      {selectedCustomer && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Invoice Preview</CardTitle>
              <Badge variant="secondary">{invoiceNumber}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* Header */}
            <div className="flex justify-between text-xs">
              <div>
                <p className="font-semibold">{dairy?.name}</p>
                <p className="text-foreground/60">{dairy?.address}</p>
                <p className="text-foreground/60">{dairy?.phone}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{selectedCustomer.name}</p>
                <p className="text-foreground/60">{selectedCustomer.phone}</p>
                <p className="text-foreground/60">{selectedCustomer.address}</p>
              </div>
            </div>

            <Separator />

            {/* Delivery Items */}
            {invoiceItems.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground/60">Delivery Items</p>
                {invoiceItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="flex-1 truncate">{item.description}</span>
                    <span className="w-12 text-right">{item.quantity}L</span>
                    <span className="w-16 text-right">{formatCurrency(item.rate)}</span>
                    <span className="w-20 text-right font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Items */}
            {customItems.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground/60">Additional Items</p>
                {customItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateCustomItem(item.id, "description", e.target.value)}
                      className="text-xs h-8 flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateCustomItem(item.id, "quantity", Number(e.target.value))}
                      className="text-xs h-8 w-14"
                    />
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) => updateCustomItem(item.id, "rate", Number(e.target.value))}
                      className="text-xs h-8 w-16"
                    />
                    <span className="text-xs w-20 text-right font-medium">{formatCurrency(item.amount)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeCustomItem(item.id)} className="h-6 w-6 p-0">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={addCustomItem} className="w-full text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add Custom Item
            </Button>

            <Separator />

            {/* Totals */}
            <div className="space-y-1 text-xs">
              {totalDeliveryAmount > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Total</span>
                  <span>{formatCurrency(totalDeliveryAmount)}</span>
                </div>
              )}
              {totalCustomAmount > 0 && (
                <div className="flex justify-between">
                  <span>Additional Items</span>
                  <span>{formatCurrency(totalCustomAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm">
                <span>Grand Total</span>
                <span className="text-emerald-600">{formatCurrency(grandTotal)}</span>
              </div>
              {totalPaid > 0 && (
                <>
                  <div className="flex justify-between text-foreground/60">
                    <span>Payments Received</span>
                    <span>-{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Balance Due</span>
                    <span className="text-red-600">{formatCurrency(roundTo2(grandTotal - totalPaid))}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
