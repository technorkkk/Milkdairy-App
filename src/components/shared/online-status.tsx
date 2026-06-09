"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function OnlineStatusProvider({ children }: { children: React.ReactNode }) {
  const setOnlineStatus = useUIStore((s) => s.setOnlineStatus);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    setOnlineStatus(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnlineStatus]);

  return <>{children}</>;
}
