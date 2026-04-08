/**
 * useCloudSync.ts
 *
 * Lightweight cloud sync status hook.
 * The heavy sync logic has been removed since data now lives in the ICP
 * entity store via useBackendStore (all reads/writes go directly to the
 * canister). This hook is retained to provide:
 *   - Sync status display in the header / BackupRestore page
 *   - Manual "Sync Now" that pings the canister to verify connectivity
 *   - loadFromCloud: triggers a React Query cache invalidation so all
 *     components re-read from the canister
 */

import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export interface CloudSyncResult {
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  syncNow: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  isOnline: boolean;
}

interface CloudActor {
  getLastSyncTime(): Promise<bigint | null>;
  getAllCloudData(): Promise<Array<[string, string]>>;
}

export function useCloudSync(): CloudSyncResult {
  const { actor: rawActor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const actor = rawActor as (typeof rawActor & CloudActor) | null;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // On mount: try to read last sync timestamp from canister for display
  useEffect(() => {
    if (!isAuthenticated || !actor || isFetching) return;
    if (typeof actor.getLastSyncTime !== "function") return;

    (async () => {
      try {
        const lastSyncTime = await actor.getLastSyncTime();
        if (lastSyncTime !== null && lastSyncTime > 0n) {
          // Convert nanoseconds (ICP time) to milliseconds
          const ms = Number(lastSyncTime / 1_000_000n);
          setLastSyncedAt(new Date(ms));
          setSyncStatus("synced");
        }
      } catch {
        // Non-critical — just leave status as idle
      }
    })();
  }, [isAuthenticated, actor, isFetching]);

  /**
   * syncNow: pings the canister to verify connectivity and updates status.
   * Since all entity data already writes directly to the canister via
   * useBackendStore mutations, there is no localStorage data to push.
   */
  const syncNow = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    setSyncStatus("syncing");
    try {
      if (typeof actor.getLastSyncTime === "function") {
        await actor.getLastSyncTime();
      }
      setLastSyncedAt(new Date());
      setSyncStatus("synced");
    } catch (err) {
      setSyncStatus("error");
      console.error("[CloudSync] Connectivity check failed:", err);
    }
  }, [actor, isAuthenticated]);

  /**
   * loadFromCloud: invalidates all React Query caches so every component
   * re-fetches its data from the canister (the true source of truth).
   */
  const loadFromCloud = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    setSyncStatus("syncing");
    try {
      await queryClient.invalidateQueries();
      setLastSyncedAt(new Date());
      setSyncStatus("synced");
      window.dispatchEvent(new CustomEvent("gst-cloud-restored"));
    } catch (err) {
      setSyncStatus("error");
      console.error("[CloudSync] Load from cloud failed:", err);
    }
  }, [actor, isAuthenticated, queryClient]);

  return { syncStatus, lastSyncedAt, syncNow, loadFromCloud, isOnline };
}
