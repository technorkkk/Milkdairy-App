"use client";

import { useState } from "react";
import { useUIStore, ViewType } from "@/stores/ui-store";
import {
  LayoutDashboard,
  Users,
  Truck,
  Wallet,
  MoreHorizontal,
  Receipt,
  Package,
  FileText,
  ClipboardList,
  Settings,
  BookOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface NavItem {
  view: ViewType;
  label: string;
  icon: React.ElementType;
}

const primaryNavItems: NavItem[] = [
  { view: "dashboard", label: "Home", icon: LayoutDashboard },
  { view: "customers", label: "Customers", icon: Users },
  { view: "deliveries", label: "Deliver", icon: Truck },
  { view: "payments", label: "Payments", icon: Wallet },
  { view: "more", label: "More", icon: MoreHorizontal },
];

const moreMenuItems: Array<{ view: ViewType; label: string; icon: React.ElementType }> = [
  { view: "expenses", label: "Expenses", icon: Receipt },
  { view: "milk-rates", label: "Milk Rates", icon: ClipboardList },
  { view: "inventory", label: "Inventory", icon: Package },
  { view: "reports", label: "Reports", icon: FileText },
  { view: "invoices", label: "Invoices", icon: BookOpen },
  { view: "audit", label: "Audit Log", icon: BookOpen },
  { view: "settings", label: "Settings", icon: Settings },
];

export function BottomNavBar() {
  const { currentView, navigate } = useUIStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleNavClick = (view: ViewType) => {
    if (view === "more") {
      setMoreOpen(true);
      return;
    }
    navigate(view);
  };

  const handleMoreItemClick = (view: ViewType) => {
    navigate(view);
    setMoreOpen(false);
  };

  const isActive = (view: ViewType) => {
    if (view === "more") {
      return ["expenses", "milk-rates", "inventory", "reports", "invoices", "audit", "settings"].includes(currentView);
    }
    return currentView === view;
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.view);
            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1 px-3 min-w-[56px] transition-colors",
                  active
                    ? "text-emerald-600"
                    : "text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                <span className={cn("text-[10px] leading-tight", active && "font-semibold")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Menu Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left">More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 p-2 pb-6">
            {moreMenuItems.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => handleMoreItemClick(item.view)}
                  aria-label={item.label}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:bg-accent transition-colors",
                    active && "border-emerald-600 bg-emerald-50"
                  )}
                >
                  <Icon className={cn("w-6 h-6", active ? "text-emerald-600" : "text-emerald-600")} />
                  <span className={cn("text-xs font-medium", active && "text-emerald-700")}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
