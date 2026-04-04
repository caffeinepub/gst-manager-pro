import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export interface CloudSyncResult {
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  syncNow: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  isOnline: boolean;
}

// Cloud sync methods available on the backend
interface CloudActor {
  saveCloudData(key: string, value: string): Promise<void>;
  getCloudData(key: string): Promise<string | null>;
  getAllCloudData(): Promise<Array<[string, string]>>;
  getLastSyncTime(): Promise<bigint | null>;
  deleteCloudData(key: string): Promise<void>;
}

const SYNC_ENABLED_KEY = "gst_cloud_sync_enabled";
const DEBOUNCE_MS = 2000;

function getGstKeys(bizId: string | null): string[] {
  const prefix = bizId ? `gst_${bizId}_` : "gst_";
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix) && k !== "gst_cloud_backups") {
      keys.push(k);
    }
  }
  // Always include global keys
  for (const k of ["gst_businesses", "gst_active_business"] as const) {
    if (localStorage.getItem(k) !== null && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

export function useCloudSync(): CloudSyncResult {
  const { actor: rawActor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  // Cast actor to include cloud methods
  const actor = rawActor as (typeof rawActor & CloudActor) | null;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeysRef = useRef<Set<string>>(new Set());
  const hasInitialSynced = useRef(false);
  const isSyncingRef = useRef(false);

  // Track online status
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

  const pushKeysToCloud = useCallback(
    async (keys: string[]) => {
      if (!actor || !isAuthenticated || isSyncingRef.current) return;
      // Guard: check cloud method actually exists at runtime
      if (typeof actor.saveCloudData !== "function") return;
      if (!isOnline) return;
      isSyncingRef.current = true;
      setSyncStatus("syncing");
      try {
        await Promise.all(
          keys.map((key) => {
            const value = localStorage.getItem(key);
            if (value !== null) {
              return actor.saveCloudData(key, value);
            }
            return Promise.resolve();
          }),
        );
        setLastSyncedAt(new Date());
        setSyncStatus("synced");
      } catch (err) {
        setSyncStatus("error");
        console.error("[CloudSync] Push failed:", err);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [actor, isAuthenticated, isOnline],
  );

  const syncNow = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    const activeBizId = localStorage.getItem("gst_active_business") || null;
    const keys = getGstKeys(activeBizId);
    await pushKeysToCloud(keys);
  }, [actor, isAuthenticated, pushKeysToCloud]);

  const loadFromCloud = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    if (typeof actor.getAllCloudData !== "function") return;
    setSyncStatus("syncing");
    try {
      const allData = await actor.getAllCloudData();
      if (allData.length === 0) {
        setSyncStatus("synced");
        return;
      }
      for (const [key, value] of allData) {
        if (key.startsWith("gst_") && key !== "gst_cloud_backups") {
          localStorage.setItem(key, value);
        }
      }
      // Notify all useLocalStorage hooks to re-read
      window.dispatchEvent(new CustomEvent("gst-cloud-restored"));
      setLastSyncedAt(new Date());
      setSyncStatus("synced");
    } catch (err) {
      setSyncStatus("error");
      console.error("[CloudSync] Load from cloud failed:", err);
    }
  }, [actor, isAuthenticated]);

  // Listen for storage changes via native storage events (cross-tab)
  // and custom mutation events (same-tab)
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncEnabled = localStorage.getItem(SYNC_ENABLED_KEY) !== "false";
    if (!syncEnabled) return;

    // Listen for custom data-change events dispatched from mutations
    const handleChange = (e: Event) => {
      const key = (e as CustomEvent<{ key: string }>).detail?.key;
      if (!key) return;
      pendingKeysRef.current.add(key);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const keys = Array.from(pendingKeysRef.current);
        pendingKeysRef.current.clear();
        await pushKeysToCloud(keys);
      }, DEBOUNCE_MS);
    };

    // Re-sync when business is switched
    const handleBusinessSwitch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const activeBizId = localStorage.getItem("gst_active_business") || null;
        const keys = getGstKeys(activeBizId);
        await pushKeysToCloud(keys);
      }, DEBOUNCE_MS);
    };

    window.addEventListener("gst-data-changed", handleChange);
    window.addEventListener("gst-business-switched", handleBusinessSwitch);
    return () => {
      window.removeEventListener("gst-data-changed", handleChange);
      window.removeEventListener("gst-business-switched", handleBusinessSwitch);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isAuthenticated, pushKeysToCloud]);

  // Initial sync on mount when authenticated + actor ready
  useEffect(() => {
    if (!isAuthenticated || !actor || isFetching || hasInitialSynced.current)
      return;
    if (typeof actor.getLastSyncTime !== "function") return;
    hasInitialSynced.current = true;

    const syncEnabled = localStorage.getItem(SYNC_ENABLED_KEY) !== "false";
    if (!syncEnabled) return;

    (async () => {
      setSyncStatus("syncing");
      try {
        const lastSyncTime = await actor.getLastSyncTime();
        if (lastSyncTime !== null && lastSyncTime > 0n) {
          // Cloud has data — merge: cloud wins for keys present in cloud
          const allData = await actor.getAllCloudData();
          for (const [key, value] of allData) {
            if (key.startsWith("gst_") && key !== "gst_cloud_backups") {
              localStorage.setItem(key, value);
            }
          }
          window.dispatchEvent(new CustomEvent("gst-cloud-restored"));
          setLastSyncedAt(new Date());
          setSyncStatus("synced");
          toast.success("Data synced from cloud", { id: "cloud-sync-init" });
        } else {
          // Cloud empty — push local data up
          await syncNow();
          toast.success("Local data saved to cloud", {
            id: "cloud-sync-init",
          });
        }
      } catch (err) {
        setSyncStatus("error");
        console.error("[CloudSync] Initial sync failed:", err);
        toast.error("Cloud sync unavailable", { id: "cloud-sync-err" });
      }
    })();
  }, [isAuthenticated, actor, isFetching, syncNow]);

  return { syncStatus, lastSyncedAt, syncNow, loadFromCloud, isOnline };
}
