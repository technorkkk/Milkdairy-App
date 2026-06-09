"use client";

import { useState, useEffect } from "react";
import { useDairyStore } from "@/stores/dairy-store";
import { useCustomerStore } from "@/stores/customer-store";
import { formatCurrency } from "@/lib/accounting";
import { formatDate, getMonthRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { BookOpen, ArrowUpCircle, ArrowDownCircle, Circle, Edit, Trash2 } from "lucide-react";

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  timestamp: string;
}

export function AuditLedgerView() {
  const { dairy } = useDairyStore();
  const { customers, loadCustomers } = useCustomerStore();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>("all");

  useEffect(() => {
    if (!dairy) return;
    setLoading(true);
    loadCustomers(dairy.id);
    fetchAuditLogs();
  }, [dairy]);

  const fetchAuditLogs = async () => {
    if (!dairy) return;
    try {
      let url = `/api/audit?dairyId=${dairy.id}&limit=200`;
      if (entityFilter !== "all") url += `&entity=${entityFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to load audit logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dairy) fetchAuditLogs();
  }, [entityFilter]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create": return <ArrowUpCircle className="w-4 h-4 text-emerald-600" />;
      case "update": return <Edit className="w-4 h-4 text-amber-600" />;
      case "delete": return <Trash2 className="w-4 h-4 text-destructive" />;
      case "login": return <Circle className="w-4 h-4 text-blue-600" />;
      case "sync": return <ArrowDownCircle className="w-4 h-4 text-purple-600" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create": return "bg-emerald-100 text-emerald-700";
      case "update": return "bg-amber-100 text-amber-700";
      case "delete": return "bg-red-100 text-red-700";
      case "login": return "bg-blue-100 text-blue-700";
      case "sync": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getEntityLabel = (entity: string) => {
    const labels: Record<string, string> = {
      customer: "Customer",
      delivery: "Delivery",
      payment: "Payment",
      expense: "Expense",
      milk_rate: "Milk Rate",
      inventory: "Inventory",
      dairy: "Dairy",
    };
    return labels[entity] || entity;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Audit Ledger
        </h2>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="delivery">Deliveries</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
            <SelectItem value="milk_rate">Milk Rates</SelectItem>
            <SelectItem value="inventory">Inventory</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : auditLogs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No audit logs yet</p>
            <p className="text-xs text-muted-foreground mt-1">Actions will be recorded here as you use the app</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-200px)]">
          <div className="space-y-2">
            {auditLogs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getActionIcon(log.action)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getEntityLabel(log.entity)}
                          </Badge>
                        </div>
                        {log.details && (
                          <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDate(log.timestamp)} &middot; {new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
