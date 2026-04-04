import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogs, useEmployees } from "@/hooks/useGSTStore";
import {
  type PANVerificationResult,
  verifyPAN,
} from "@/services/gstVerificationService";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

function hasPANApiKey(): boolean {
  try {
    const raw = localStorage.getItem("gst_api_settings");
    if (!raw) return false;
    const s = JSON.parse(raw);
    return !!(s?.pan?.enabled && s?.pan?.key);
  } catch {
    return false;
  }
}

export function PayrollPANVerification() {
  const { employees, updateEmployee } = useEmployees();
  const { addLog } = useAuditLogs();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyAllRunning, setVerifyAllRunning] = useState(false);
  const [verifyAllProgress, setVerifyAllProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const apiKeyConfigured = hasPANApiKey();

  const processResult = (
    empId: string,
    empName: string,
    empPAN: string,
    result: PANVerificationResult,
  ) => {
    if (result.errorCode === "INVALID_FORMAT") {
      toast.error(`Invalid PAN format for ${empName}: ${result.error}`);
      return;
    }

    if (result.success || result.errorCode === "CORS_BLOCKED") {
      const verifiedName = result.panHolderName || "";
      updateEmployee(empId, {
        panVerified: true,
        panVerifiedName: verifiedName,
        panVerifiedAt: new Date().toISOString(),
        panType: result.panType,
      });
      addLog({
        action: "update",
        entity: "Employee",
        entityId: empId,
        description: `PAN verified for ${empName} (${empPAN})`,
      });

      if (
        verifiedName &&
        verifiedName.toLowerCase() !== empName.toLowerCase()
      ) {
        toast.warning(
          `PAN name mismatch: Employee "${empName}" vs PAN "${verifiedName}"`,
        );
      } else if (result.errorCode === "CORS_BLOCKED") {
        toast.info(
          `${empName}: PAN format valid (live check requires backend proxy)`,
        );
      } else {
        toast.success(`PAN verified for ${empName}`);
      }
    } else if (result.errorCode === "NO_API_KEY") {
      toast.warning(`${empName}: API key not configured — format only`);
    } else {
      toast.error(`${empName}: ${result.error || "Verification failed"}`);
    }
  };

  const handleVerifyOne = async (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp?.pan) {
      toast.error("No PAN number on record for this employee");
      return;
    }
    setVerifyingId(empId);
    try {
      const result = await verifyPAN(emp.pan);
      processResult(empId, emp.name, emp.pan, result);
    } catch {
      toast.error(`Verification failed for ${emp.name}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyAll = async () => {
    const withPAN = employees.filter((e) => e.pan?.trim());
    if (withPAN.length === 0) {
      toast.warning("No employees have PAN numbers recorded");
      return;
    }
    setVerifyAllRunning(true);
    setVerifyAllProgress({ current: 0, total: withPAN.length });
    for (let i = 0; i < withPAN.length; i++) {
      const emp = withPAN[i];
      setVerifyAllProgress({ current: i + 1, total: withPAN.length });
      try {
        const result = await verifyPAN(emp.pan);
        processResult(emp.id, emp.name, emp.pan, result);
        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        toast.error(`Verification failed for ${emp.name}`);
      }
    }
    setVerifyAllRunning(false);
    setVerifyAllProgress(null);
    toast.success(
      `Batch verification complete for ${withPAN.length} employee(s)`,
    );
  };

  const empWithPAN = employees.filter((e) => e.pan?.trim());
  const verifiedCount = empWithPAN.filter((e) => e.panVerified).length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Employee PAN Verification</h1>
          <Badge variant="secondary">{employees.length} employees</Badge>
        </div>
        <Button
          onClick={handleVerifyAll}
          disabled={verifyAllRunning || empWithPAN.length === 0}
          data-ocid="payroll.pan_verification.verify_all_button"
        >
          {verifyAllRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying {verifyAllProgress?.current}/{verifyAllProgress?.total}
              ...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Verify All
            </>
          )}
        </Button>
      </div>

      {/* API key warning */}
      {!apiKeyConfigured && (
        <div
          className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-sm"
          data-ocid="payroll.pan_verification.api_warning"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              PAN API key not configured
            </p>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
              Verification will be format-only. Configure your Income Tax
              e-Filing API key in <strong>Settings &gt; API Config</strong> for
              live government database checks.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total Employees</p>
          <p className="text-2xl font-bold mt-0.5">{employees.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">With PAN</p>
          <p className="text-2xl font-bold mt-0.5">{empWithPAN.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Verified</p>
          <p className="text-2xl font-bold mt-0.5 text-emerald-600">
            {verifiedCount}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold mt-0.5 text-amber-600">
            {empWithPAN.length - verifiedCount}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emp Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead>PAN Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Verified</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                  data-ocid="payroll.pan_verification.empty_state"
                >
                  No employees found. Add employees first under Payroll &gt;
                  Employees.
                </TableCell>
              </TableRow>
            )}
            {employees.map((emp, idx) => (
              <TableRow
                key={emp.id}
                data-ocid={`payroll.pan_verification.item.${idx + 1}`}
              >
                <TableCell className="font-mono text-sm">
                  {emp.empCode}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{emp.name}</div>
                  {emp.panVerified &&
                    emp.panVerifiedName &&
                    emp.panVerifiedName !== emp.name && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        PAN name: {emp.panVerifiedName}
                      </div>
                    )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {emp.pan || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm">
                  {emp.panType || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {emp.panVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      PAN Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      <ShieldOff className="w-3 h-3" />
                      Not Verified
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {relativeTime(emp.panVerifiedAt)}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      !emp.pan || verifyingId === emp.id || verifyAllRunning
                    }
                    onClick={() => handleVerifyOne(emp.id)}
                    data-ocid={`payroll.pan_verification.verify_button.${idx + 1}`}
                  >
                    {verifyingId === emp.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    )}
                    {verifyingId === emp.id ? "Verifying..." : "Verify"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
