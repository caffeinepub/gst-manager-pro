// All localStorage keys used by the app
const CLOUD_BACKUPS_KEY = "gst_cloud_backups";
const MAX_CLOUD_BACKUPS = 10;

export interface CloudBackup {
  id: string;
  name: string;
  timestamp: string;
  sizeBytes: number;
  data: Record<string, unknown>;
}

function collectAllData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("gst_") && key !== CLOUD_BACKUPS_KEY) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
  }
  return data;
}

export function useBackup() {
  // Local backup: download JSON file
  const createLocalBackup = () => {
    const data = collectAllData();
    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      appName: "GST Manager Pro",
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

  // Local restore: parse file and restore all keys
  const restoreFromFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          const data = content.data || content;
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith("gst_")) {
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

  // Cloud backups (stored in localStorage as versioned snapshots)
  const getCloudBackups = (): CloudBackup[] => {
    try {
      return JSON.parse(localStorage.getItem(CLOUD_BACKUPS_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const createCloudBackup = (name: string): CloudBackup => {
    const data = collectAllData();
    const json = JSON.stringify(data);
    const backup: CloudBackup = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || `Backup ${new Date().toLocaleDateString("en-IN")}`,
      timestamp: new Date().toISOString(),
      sizeBytes: new Blob([json]).size,
      data,
    };
    const existing = getCloudBackups();
    const updated = [backup, ...existing].slice(0, MAX_CLOUD_BACKUPS);
    localStorage.setItem(CLOUD_BACKUPS_KEY, JSON.stringify(updated));
    return backup;
  };

  const restoreCloudBackup = (id: string): void => {
    const backups = getCloudBackups();
    const backup = backups.find((b) => b.id === id);
    if (!backup) throw new Error("Backup not found");
    for (const [key, value] of Object.entries(backup.data)) {
      if (key.startsWith("gst_")) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  };

  const deleteCloudBackup = (id: string): void => {
    const updated = getCloudBackups().filter((b) => b.id !== id);
    localStorage.setItem(CLOUD_BACKUPS_KEY, JSON.stringify(updated));
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
