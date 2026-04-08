import { useActor } from "@/hooks/useActor";

const MAX_CLOUD_BACKUPS = 10;
const CLOUD_SNAPSHOTS_KEY = "gst_cloud_snapshots"; // localStorage key for local snapshots list

export interface CloudBackup {
  id: string;
  name: string;
  timestamp: string;
  sizeBytes: number;
  data: Record<string, unknown>;
}

// Entity types stored in the ICP entity store
const ENTITY_TYPES = [
  "invoices",
  "purchases",
  "parties",
  "items",
  "tax_rates",
  "employees",
  "attendance",
  "payroll_runs",
  "journal",
  "cashbook",
  "bank_accounts",
  "bank_txns",
  "audit_logs",
  "custom_accounts",
  "stock_movements",
  "leave_balances",
  "payments",
] as const;

interface BackupActor {
  getAllEntityRecords(bizId: string, entityType: string): Promise<string[]>;
  saveCloudData(key: string, value: string): Promise<void>;
  getCloudData(key: string): Promise<string | null>;
}

export function useBackup() {
  const { actor: rawActor } = useActor();
  const actor = rawActor as (typeof rawActor & BackupActor) | null;

  // Collect all data from the ICP entity store for the active business
  const collectAllData = async (): Promise<Record<string, unknown>> => {
    const bizId = localStorage.getItem("gst_active_business") ?? "";
    const data: Record<string, unknown> = {};

    // UI state keys that are legitimately in localStorage
    const uiKeys = [
      "gst_active_business",
      "gst_businesses",
      "gst_cloud_sync_enabled",
    ];
    for (const k of uiKeys) {
      const v = localStorage.getItem(k);
      if (v !== null) {
        try {
          data[k] = JSON.parse(v);
        } catch {
          data[k] = v;
        }
      }
    }

    if (actor && bizId) {
      await Promise.all(
        ENTITY_TYPES.map(async (et) => {
          try {
            const records = await actor.getAllEntityRecords(bizId, et);
            const parsed = records.map((r) => {
              try {
                return JSON.parse(r);
              } catch {
                return r;
              }
            });
            if (parsed.length > 0) data[`entity_${et}`] = parsed;
          } catch {
            // skip entity types that don't exist yet
          }
        }),
      );
    }
    return data;
  };

  // Local backup: download JSON file with entity store data
  const createLocalBackup = async () => {
    const data = await collectAllData();
    const backup = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      appName: "GST Manager Pro",
      source: "ICP Entity Store",
      data,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gst_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Local restore: parse file and restore UI state keys only
  // (entity data restoration requires separate import flow)
  const restoreFromFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          const data = content.data || content;
          // Only restore UI state keys from file (entity data is in canister)
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith("gst_") && !key.startsWith("entity_")) {
              localStorage.setItem(key, JSON.stringify(value));
            }
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  // Cloud snapshots: stored in localStorage as versioned local snapshots list
  const getCloudBackups = (): CloudBackup[] => {
    try {
      return JSON.parse(localStorage.getItem(CLOUD_SNAPSHOTS_KEY) || "[]");
    } catch {
      return [];
    }
  };

  // Create a cloud snapshot: persists full entity data to the ICP canister
  // via saveCloudData, and stores the snapshot manifest in localStorage
  const createCloudBackup = async (name: string): Promise<CloudBackup> => {
    const data = await collectAllData();
    const json = JSON.stringify(data);
    const backup: CloudBackup = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || `Backup ${new Date().toLocaleDateString("en-IN")}`,
      timestamp: new Date().toISOString(),
      sizeBytes: new Blob([json]).size,
      data,
    };

    // Persist snapshot data to canister
    if (actor && typeof actor.saveCloudData === "function") {
      try {
        await actor.saveCloudData(`snapshot_${backup.id}`, json);
      } catch (err) {
        console.warn(
          "[useBackup] Failed to persist snapshot to canister:",
          err,
        );
      }
    }

    // Store the manifest (without full data to save localStorage space)
    const manifestOnly: CloudBackup = { ...backup, data: {} };
    const existing = getCloudBackups();
    const updated = [manifestOnly, ...existing].slice(0, MAX_CLOUD_BACKUPS);
    localStorage.setItem(CLOUD_SNAPSHOTS_KEY, JSON.stringify(updated));

    return backup;
  };

  const restoreCloudBackup = async (id: string): Promise<void> => {
    // Try to load from canister first
    if (actor && typeof actor.getCloudData === "function") {
      try {
        const stored = await actor.getCloudData(`snapshot_${id}`);
        if (stored) {
          const data = JSON.parse(stored) as Record<string, unknown>;
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith("gst_") && !key.startsWith("entity_")) {
              localStorage.setItem(key, JSON.stringify(value));
            }
          }
          return;
        }
      } catch (err) {
        console.warn("[useBackup] Canister restore failed, trying local:", err);
      }
    }
    // Fallback to locally cached snapshot data
    const backups = getCloudBackups();
    const backup = backups.find((b) => b.id === id);
    if (!backup) throw new Error("Backup not found");
    for (const [key, value] of Object.entries(backup.data)) {
      if (key.startsWith("gst_") && !key.startsWith("entity_")) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  };

  const deleteCloudBackup = (id: string): void => {
    const updated = getCloudBackups().filter((b) => b.id !== id);
    localStorage.setItem(CLOUD_SNAPSHOTS_KEY, JSON.stringify(updated));
    // Best-effort: remove from canister too
    if (actor && typeof actor.saveCloudData === "function") {
      // There's no delete method exposed, so we overwrite with empty
      actor.saveCloudData(`snapshot_${id}`, "{}").catch(() => {});
    }
  };

  return {
    createLocalBackup,
    restoreFromFile,
    getCloudBackups,
    createCloudBackup,
    restoreCloudBackup,
    deleteCloudBackup,
  };
}
