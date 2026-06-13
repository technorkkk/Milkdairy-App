"use client";

import { useUIStore, ViewType } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useDairyStore } from "@/stores/dairy-store";
import { OnlineStatusProvider } from "@/components/shared/online-status";
import { SyncBanner } from "@/components/shared/sync-banner";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { DairySetupWizard } from "@/components/dairy/setup-wizard";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { CustomerListView } from "@/components/customers/customer-list-view";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { DeliveryBoardView } from "@/components/deliveries/delivery-board-view";
import { PaymentListView } from "@/components/payments/payment-list-view";
import { ExpenseListView } from "@/components/expenses/expense-list-view";
import { MilkRateView } from "@/components/inventory/milk-rate-view";
import { InventoryListView } from "@/components/inventory/inventory-list-view";
import { ReportsView } from "@/components/reports/reports-view";
import { InvoiceBuilderView } from "@/components/invoices/invoice-builder-view";
import { AuditLedgerView } from "@/components/audit/audit-ledger-view";
import { SettingsView } from "@/components/settings/settings-view";
import { BottomNavBar } from "@/components/shared/bottom-nav-bar";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export function AppShell() {
  const { currentView, navigate, isOnline } = useUIStore();
  const { isAuthenticated, user } = useAuthStore();
  const { isSetup, loadDairy } = useDairyStore();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDairy(user.id).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, loadDairy]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading Dairy Ledger...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <OnlineStatusProvider>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white p-4">
          <AnimatePresence mode="wait">
            {authMode === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <LoginForm onSwitchToSignup={() => setAuthMode("signup")} />
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SignupForm onSwitchToLogin={() => setAuthMode("login")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </OnlineStatusProvider>
    );
  }

  if (!isSetup) {
    return (
      <OnlineStatusProvider>
        <DairySetupWizard />
      </OnlineStatusProvider>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView />;
      case "customers":
        return <CustomerListView />;
      case "customer-detail":
        return <CustomerDetailView />;
      case "deliveries":
        return <DeliveryBoardView />;
      case "payments":
        return <PaymentListView />;
      case "expenses":
        return <ExpenseListView />;
      case "milk-rates":
        return <MilkRateView />;
      case "inventory":
        return <InventoryListView />;
      case "reports":
        return <ReportsView />;
      case "invoices":
        return <InvoiceBuilderView />;
      case "audit":
        return <AuditLedgerView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <OnlineStatusProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <SyncBanner />
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">D</span>
              </div>
              <h1 className="text-lg font-semibold text-foreground">Dairy Ledger</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground/60 flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNavBar />
      </div>
    </OnlineStatusProvider>
  );
}
