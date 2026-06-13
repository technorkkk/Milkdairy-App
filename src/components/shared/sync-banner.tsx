"use client";

import { useUIStore } from "@/stores/ui-store";
import { useSyncStore } from "@/stores/sync-store";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncBanner() {
  const isOnline = useUIStore((s) => s.isOnline);
  const syncPending = useSyncStore((s) => s.queue.filter((q) => q.status === "pending" || q.status === "failed").length);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  if (isOnline && syncPending === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium transition-all",
        !isOnline
          ? "bg-amber-100 text-amber-900"
          : syncPending > 0
          ? "bg-blue-100 text-blue-900"
          : "bg-emerald-100 text-emerald-800"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline mode — changes will sync when connected</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Syncing {syncPending} pending changes...</span>
        </>
      ) : syncPending > 0 ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>{syncPending} changes pending sync</span>
        </>
      ) : null}
    </div>
  );
}
