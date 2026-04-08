import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type CloudBackup, useBackup } from "@/hooks/useBackup";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Download,
  FileJson,
  HardDrive,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SYNC_ENABLED_KEY = "gst_cloud_sync_enabled";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(date: Date | null): string {
  if (!date) return "Never";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BackupRestore() {
  const {
    createLocalBackup,
    restoreFromFile,
    getCloudBackups,
    createCloudBackup,
    restoreCloudBackup,
    deleteCloudBackup,
  } = useBackup();

  const { syncStatus, lastSyncedAt, syncNow, loadFromCloud, isOnline } =
    useCloudSync();
  const queryClient = useQueryClient();

  const [cloudBackups, setCloudBackups] =
    useState<CloudBackup[]>(getCloudBackups);
  const [cloudName, setCloudName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreatingCloud, setIsCreatingCloud] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(
    () => localStorage.getItem(SYNC_ENABLED_KEY) !== "false",
  );
  const [cloudRestoreConfirmOpen, setCloudRestoreConfirmOpen] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  // AlertDialog states
  const [fileRestoreOpen, setFileRestoreOpen] = useState(false);
  const [cloudRestoreId, setCloudRestoreId] = useState<string | null>(null);
  const [cloudDeleteId, setCloudDeleteId] = useState<string | null>(null);

  const refreshCloudBackups = () => setCloudBackups(getCloudBackups());

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem(SYNC_ENABLED_KEY, String(enabled));
    if (enabled) {
      toast.success(
        "Auto-sync enabled — changes will save to cloud automatically",
      );
    } else {
      toast.info("Auto-sync disabled");
    }
  };

  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    try {
      await syncNow();
      toast.success("All data synced to cloud");
    } catch {
      toast.error("Sync failed — please try again");
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    try {
      await loadFromCloud();
      // Invalidate all React Query caches so UI reflects restored data
      await queryClient.invalidateQueries();
      toast.success(
        "Data restored from cloud! All views have been refreshed.",
        { duration: 6000 },
      );
    } catch {
      toast.error("Failed to restore from cloud");
    } finally {
      setCloudRestoreConfirmOpen(false);
    }
  };

  // ── Local Backup ──────────────────────────────────────────────────────────

  const handleDownload = async () => {
    try {
      await createLocalBackup();
      toast.success("Backup downloaded — includes ICP entity store data");
    } catch (err) {
      toast.error(
        `Backup failed: ${(err as Error)?.message || "Unknown error"}`,
      );
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".json")) {
      setSelectedFile(file);
    } else {
      toast.error("Please drop a valid .json backup file");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleFileRestore = async () => {
    if (!selectedFile) return;
    setIsRestoring(true);
    try {
      await restoreFromFile(selectedFile);
      toast.success(
        "Data restored successfully! Please refresh the page to see changes.",
        { duration: 6000 },
      );
      setSelectedFile(null);
    } catch (err) {
      toast.error(
        `Restore failed: ${(err as Error)?.message || "Invalid file"}`,
      );
    } finally {
      setIsRestoring(false);
      setFileRestoreOpen(false);
    }
  };

  // ── Cloud Backup ──────────────────────────────────────────────────────────

  const handleCreateCloud = async () => {
    setIsCreatingCloud(true);
    try {
      await createCloudBackup(cloudName);
      refreshCloudBackups();
      setCloudName("");
      toast.success("Cloud snapshot created");
    } catch (err) {
      toast.error(`Failed to create snapshot: ${(err as Error)?.message}`);
    } finally {
      setIsCreatingCloud(false);
    }
  };

  const handleCloudRestore = async (id: string) => {
    try {
      await restoreCloudBackup(id);
      toast.success(
        "Data restored successfully! Please refresh the page to see changes.",
        { duration: 6000 },
      );
    } catch (err) {
      toast.error(`Restore failed: ${(err as Error)?.message}`);
    } finally {
      setCloudRestoreId(null);
    }
  };

  const handleCloudDelete = (id: string) => {
    deleteCloudBackup(id);
    refreshCloudBackups();
    toast.success("Snapshot deleted");
    setCloudDeleteId(null);
  };

  // Sync status display helpers
  const syncStatusBadge = (() => {
    if (!isOnline)
      return (
        <Badge variant="secondary" className="gap-1">
          <WifiOff className="w-3 h-3" /> Offline
        </Badge>
      );
    if (syncStatus === "syncing")
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Syncing...
        </Badge>
      );
    if (syncStatus === "synced")
      return (
        <Badge
          variant="secondary"
          className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
        >
          <CheckCircle2 className="w-3 h-3" /> Synced
        </Badge>
      );
    if (syncStatus === "error")
      return (
        <Badge variant="destructive" className="gap-1">
          <CloudOff className="w-3 h-3" /> Sync Error
        </Badge>
      );
    return (
      <Badge variant="outline" className="gap-1">
        <Cloud className="w-3 h-3" /> Idle
      </Badge>
    );
  })();

  return (
    <div className="max-w-4xl space-y-6" data-ocid="backup.section">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          Backup &amp; Restore
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Protect your GST data with local downloads, cloud snapshots, and
          real-time auto-sync.
        </p>
      </div>

      {/* ── REAL-TIME CLOUD SYNC SECTION ─────────────────────────────── */}
      <Card className="bg-card border-border/70" data-ocid="backup.sync.card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="w-4 h-4 text-primary" />
            Real-Time Cloud Sync
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-500 ml-1" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            )}
          </CardTitle>
          <CardDescription>
            Automatically saves all your GST data to the secure ICP cloud
            whenever changes are made. Data is encrypted on-chain and tied to
            your Internet Identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Status row */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {syncStatusBadge}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Last synced:
              </span>
              <span className="text-sm font-medium">
                {formatDate(lastSyncedAt)}
              </span>
            </div>
          </div>

          {/* Auto-sync toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 bg-muted/20">
            <div>
              <p className="text-sm font-medium">Auto-Sync</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically sync data to cloud within 2 seconds of any change
              </p>
            </div>
            <Switch
              checked={autoSyncEnabled}
              onCheckedChange={handleAutoSyncToggle}
              data-ocid="backup.sync.auto.switch"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSyncNow}
              disabled={isSyncingNow || syncStatus === "syncing" || !isOnline}
              data-ocid="backup.sync.now.button"
            >
              {isSyncingNow || syncStatus === "syncing" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync Now
            </Button>
            <Button
              variant="outline"
              onClick={() => setCloudRestoreConfirmOpen(true)}
              disabled={!isOnline}
              data-ocid="backup.sync.restore.button"
            >
              <Download className="w-4 h-4 mr-2" />
              Restore from Cloud
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="local" data-ocid="backup.tab">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger
            value="local"
            data-ocid="backup.local.tab"
            className="flex items-center gap-1.5"
          >
            <HardDrive className="w-3.5 h-3.5" />
            Local
          </TabsTrigger>
          <TabsTrigger
            value="cloud"
            data-ocid="backup.cloud.tab"
            className="flex items-center gap-1.5"
          >
            <Cloud className="w-3.5 h-3.5" />
            Cloud Snapshots
          </TabsTrigger>
        </TabsList>

        {/* ── LOCAL TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="local" className="mt-6 space-y-6">
          {/* Download */}
          <Card className="bg-card border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="w-4 h-4 text-primary" />
                Download Local Backup
              </CardTitle>
              <CardDescription>
                Exports all your app data (invoices, masters, accounting,
                compliance records) into a single JSON file on your device. Keep
                it safe — you can restore from it anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => void handleDownload()}
                data-ocid="backup.local.download.button"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Backup
              </Button>
            </CardContent>
          </Card>

          {/* Restore */}
          <Card className="bg-card border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="w-4 h-4 text-primary" />
                Restore from File
              </CardTitle>
              <CardDescription>
                Select a previously downloaded <code>.json</code> backup file.
                All current app data will be replaced.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropzone */}
              <label
                htmlFor="backup-file-input"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                className={`flex flex-col items-center border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                data-ocid="backup.local.dropzone"
              >
                <FileJson className="w-8 h-8 mb-2 text-muted-foreground" />
                {selectedFile ? (
                  <div>
                    <p className="font-medium text-foreground">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Drag &amp; drop a{" "}
                    <span className="font-medium text-foreground">.json</span>{" "}
                    backup file here, or click to browse
                  </p>
                )}
                <input
                  id="backup-file-input"
                  type="file"
                  accept=".json"
                  className="sr-only"
                  onChange={handleFileSelect}
                  data-ocid="backup.local.upload_button"
                />
              </label>

              <Button
                onClick={() => {
                  if (!selectedFile) {
                    toast.error("Please select a backup file first");
                    return;
                  }
                  setFileRestoreOpen(true);
                }}
                variant="destructive"
                disabled={isRestoring}
                data-ocid="backup.local.restore.button"
              >
                <Upload className="w-4 h-4 mr-2" />
                Restore from File
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CLOUD TAB ────────────────────────────────────────────────── */}
        <TabsContent value="cloud" className="mt-6 space-y-6">
          {/* Create snapshot */}
          <Card className="bg-card border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cloud className="w-4 h-4 text-primary" />
                Create Cloud Snapshot
              </CardTitle>
              <CardDescription>
                Snapshots are stored securely within the app (up to 10). Use
                them to checkpoint before filing, bulk edits, or major changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="cloudBackupName">Snapshot Name</Label>
                  <Input
                    id="cloudBackupName"
                    value={cloudName}
                    onChange={(e) => setCloudName(e.target.value)}
                    placeholder="e.g. Pre-filing backup Mar 2026"
                    data-ocid="backup.cloud.name.input"
                  />
                </div>
                <Button
                  onClick={handleCreateCloud}
                  disabled={isCreatingCloud}
                  data-ocid="backup.cloud.create.button"
                >
                  <Cloud className="w-4 h-4 mr-2" />
                  Create Snapshot
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Snapshot list */}
          <Card className="bg-card border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base justify-between">
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Saved Snapshots
                </span>
                <Badge variant="secondary">{cloudBackups.length} / 10</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cloudBackups.length === 0 ? (
                <div
                  className="text-center py-10 text-muted-foreground"
                  data-ocid="backup.cloud.empty_state"
                >
                  <Cloud className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No snapshots yet.</p>
                  <p className="text-xs mt-1">
                    Create your first snapshot above.
                  </p>
                </div>
              ) : (
                <Table data-ocid="backup.cloud.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cloudBackups.map((backup, idx) => (
                      <TableRow
                        key={backup.id}
                        data-ocid={`backup.cloud.item.${idx + 1}`}
                      >
                        <TableCell className="font-medium">
                          {backup.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(backup.timestamp).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatBytes(backup.sizeBytes)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCloudRestoreId(backup.id)}
                              data-ocid={`backup.cloud.restore.button.${idx + 1}`}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setCloudDeleteId(backup.id)}
                              data-ocid={`backup.cloud.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── DIALOGS ───────────────────────────────────────────────────────── */}

      {/* Cloud restore from real-time sync */}
      <AlertDialog
        open={cloudRestoreConfirmOpen}
        onOpenChange={setCloudRestoreConfirmOpen}
      >
        <AlertDialogContent data-ocid="backup.sync.restore.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from Cloud?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>overwrite your local data</strong> with the
              latest version from the ICP cloud. Any unsaved local changes will
              be lost. Consider downloading a local backup first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="backup.sync.restore.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreFromCloud}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="backup.sync.restore.confirm_button"
            >
              Yes, Restore from Cloud
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File restore confirm */}
      <AlertDialog open={fileRestoreOpen} onOpenChange={setFileRestoreOpen}>
        <AlertDialogContent data-ocid="backup.local.restore.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>overwrite ALL current app data</strong> with the
              data from{" "}
              <span className="font-medium">{selectedFile?.name}</span>. This
              action cannot be undone. Consider creating a cloud snapshot first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="backup.local.restore.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFileRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="backup.local.restore.confirm_button"
            >
              Yes, Restore Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cloud snapshot restore confirm */}
      <AlertDialog
        open={!!cloudRestoreId}
        onOpenChange={(o) => !o && setCloudRestoreId(null)}
      >
        <AlertDialogContent data-ocid="backup.cloud.restore.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>overwrite ALL current app data</strong> with the
              selected snapshot. Consider creating a new snapshot of your
              current state before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="backup.cloud.restore.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cloudRestoreId && handleCloudRestore(cloudRestoreId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="backup.cloud.restore.confirm_button"
            >
              Yes, Restore Snapshot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cloud snapshot delete confirm */}
      <AlertDialog
        open={!!cloudDeleteId}
        onOpenChange={(o) => !o && setCloudDeleteId(null)}
      >
        <AlertDialogContent data-ocid="backup.cloud.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              This snapshot will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="backup.cloud.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cloudDeleteId && handleCloudDelete(cloudDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="backup.cloud.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
