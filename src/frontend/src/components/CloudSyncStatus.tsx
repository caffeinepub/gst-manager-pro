import { useCloudSync } from "@/hooks/useCloudSync";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

function useRelativeTime(date: Date | null): string {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!date) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [date]);

  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  return `${diffH}h ago`;
}

export function CloudSyncStatus() {
  const { identity } = useInternetIdentity();
  const { syncStatus, lastSyncedAt, syncNow } = useCloudSync();
  const relativeTime = useRelativeTime(lastSyncedAt);

  if (!identity) return null;

  if (syncStatus === "syncing") {
    return (
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground select-none"
        data-ocid="cloud.sync.loading_state"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span className="hidden sm:inline">Syncing...</span>
      </div>
    );
  }

  if (syncStatus === "error") {
    return (
      <button
        type="button"
        onClick={() => syncNow()}
        className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
        title="Sync failed — click to retry"
        data-ocid="cloud.sync.error_state"
      >
        <CloudOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sync error</span>
        <RefreshCw className="w-3 h-3" />
      </button>
    );
  }

  if (syncStatus === "synced") {
    return (
      <button
        type="button"
        onClick={() => syncNow()}
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors",
        )}
        title={`Saved to cloud${lastSyncedAt ? ` · ${relativeTime}` : ""} — click to sync now`}
        data-ocid="cloud.sync.success_state"
      >
        <Cloud className="w-3.5 h-3.5 text-emerald-500" />
        <span className="hidden md:inline">
          {relativeTime ? relativeTime : "Saved"}
        </span>
      </button>
    );
  }

  // idle
  return (
    <button
      type="button"
      onClick={() => syncNow()}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Click to sync to cloud"
      data-ocid="cloud.sync.button"
    >
      <Cloud className="w-3.5 h-3.5" />
    </button>
  );
}
