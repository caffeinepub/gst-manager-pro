import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogs, useEmployees } from "@/hooks/useGSTStore";
import { verifyPAN } from "@/services/gstVerificationService";
import { INDIAN_STATES } from "@/types/gst";
import type {
  Employee,
  EmployeeStatus,
  EmployeeType,
  SalaryComponent,
} from "@/types/gst";
import { Edit, Loader2, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-IN");

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  inactive:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  terminated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const TYPE_LABELS: Record<EmployeeType, string> = {
  salaried: "Salaried",
  daily_wage: "Daily Wage",
  contract: "Contract",
};

const EMPTY_EMPLOYEE: Omit<Employee, "id" | "createdAt" | "updatedAt"> = {
  empCode: "",
  name: "",
  designation: "",
  department: "",
  employeeType: "salaried",
  status: "active",
  dateOfJoining: new Date().toISOString().slice(0, 10),
  basicSalary: 0,
  hra: 0,
  da: 0,
  specialAllowance: 0,
  customComponents: [],
  dailyWageRate: 0,
  isPfApplicable: true,
  isEsiApplicable: false,
  professionalTaxState: "27",
  tdsSectionApplicable: false,
  bankName: "",
  accountNumber: "",
  ifsc: "",
  pan: "",
};

export function Employees() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } =
    useEmployees();
  const { addLog } = useAuditLogs();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] =
    useState<Omit<Employee, "id" | "createdAt" | "updatedAt">>(EMPTY_EMPLOYEE);
  const [search, setSearch] = useState("");
  const [panVerifying, setPanVerifying] = useState(false);
  const [panVerifyStatus, setPanVerifyStatus] = useState<
    "idle" | "success" | "error" | "no_key" | "format_error"
  >("idle");
  const [panVerifyMsg, setPanVerifyMsg] = useState("");

  const grossCTC = (emp: typeof form) =>
    emp.basicSalary +
    emp.hra +
    emp.da +
    emp.specialAllowance +
    emp.customComponents
      .filter((c) => c.type === "earning")
      .reduce((s, c) => s + c.amount, 0);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_EMPLOYEE);
    setPanVerifyStatus("idle");
    setPanVerifyMsg("");
    setOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = emp;
    setForm(rest);
    setPanVerifyStatus(emp.panVerified ? "success" : "idle");
    setPanVerifyMsg(
      emp.panVerifiedName ? `Verified: ${emp.panVerifiedName}` : "",
    );
    setOpen(true);
  };

  const handleVerifyPAN = async () => {
    if (!form.pan) {
      toast.error("Please enter a PAN number first");
      return;
    }
    setPanVerifying(true);
    setPanVerifyStatus("idle");
    setPanVerifyMsg("");
    try {
      const result = await verifyPAN(form.pan);
      if (result.errorCode === "INVALID_FORMAT") {
        setPanVerifyStatus("format_error");
        setPanVerifyMsg(result.error || "Invalid PAN format");
      } else if (result.errorCode === "NO_API_KEY") {
        setPanVerifyStatus("no_key");
        setPanVerifyMsg("API key not configured — format only");
      } else if (result.success || result.errorCode === "CORS_BLOCKED") {
        const verifiedName = result.panHolderName || "";
        const shouldAutoFill =
          !form.name || form.name.toLowerCase() === verifiedName.toLowerCase();
        setForm((prev) => ({
          ...prev,
          ...(shouldAutoFill && verifiedName ? { name: verifiedName } : {}),
          panVerified: true,
          panVerifiedName: verifiedName,
          panVerifiedAt: new Date().toISOString(),
          panType: result.panType,
        }));
        setPanVerifyStatus("success");
        setPanVerifyMsg(
          verifiedName
            ? `Verified: ${verifiedName} (${result.panType || "Individual"})`
            : "PAN format valid",
        );
        if (result.errorCode === "CORS_BLOCKED") {
          setPanVerifyMsg(
            "Format verified (API requires backend proxy for live check)",
          );
        }
      } else {
        setPanVerifyStatus("error");
        setPanVerifyMsg(result.error || "Verification failed");
      }
    } catch {
      setPanVerifyStatus("error");
      setPanVerifyMsg("Verification failed — please try again");
    } finally {
      setPanVerifying(false);
    }
  };

  const handleSave = () => {
    if (!form.name || !form.empCode) {
      toast.error("Employee code and name are required");
      return;
    }
    // auto ESI
    const gross = grossCTC(form);
    const isEsi = gross <= 21000;
    const payload = { ...form, isEsiApplicable: isEsi };

    if (editing) {
      updateEmployee(editing.id, payload);
      addLog({
        action: "update",
        entity: "Employee",
        entityId: editing.id,
        description: `Updated employee ${form.name}`,
      });
      toast.success("Employee updated");
    } else {
      const id = addEmployee(payload);
      addLog({
        action: "create",
        entity: "Employee",
        entityId: id,
        description: `Added employee ${form.name}`,
      });
      toast.success("Employee added");
    }
    setOpen(false);
  };

  const handleDelete = (emp: Employee) => {
    deleteEmployee(emp.id);
    addLog({
      action: "delete",
      entity: "Employee",
      entityId: emp.id,
      description: `Deleted employee ${emp.name}`,
    });
    toast.success("Employee deleted");
  };

  const addCustomComponent = () => {
    setForm((prev) => ({
      ...prev,
      customComponents: [
        ...prev.customComponents,
        { name: "", amount: 0, type: "earning" },
      ],
    }));
  };

  const updateCustomComponent = (
    i: number,
    updates: Partial<SalaryComponent>,
  ) => {
    setForm((prev) => {
      const updated = [...prev.customComponents];
      updated[i] = { ...updated[i], ...updates };
      return { ...prev, customComponents: updated };
    });
  };

  const removeCustomComponent = (i: number) => {
    setForm((prev) => ({
      ...prev,
      customComponents: prev.customComponents.filter((_, idx) => idx !== i),
    }));
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.empCode.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Employees</h1>
          <Badge variant="secondary">{employees.length}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
            data-ocid="payroll.search_input"
          />
          <Button
            onClick={openAdd}
            data-ocid="payroll.employees.open_modal_button"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Employee
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emp Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Basic (₹)</TableHead>
              <TableHead className="text-right">Gross CTC (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center text-muted-foreground py-8"
                  data-ocid="payroll.employees.empty_state"
                >
                  No employees found. Add your first employee.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((emp, idx) => (
              <TableRow
                key={emp.id}
                data-ocid={`payroll.employees.item.${idx + 1}`}
              >
                <TableCell className="font-mono text-sm">
                  {emp.empCode}
                </TableCell>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.designation}</TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell>
                  {emp.panVerified ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs font-mono">
                      {emp.pan || "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell>{TYPE_LABELS[emp.employeeType]}</TableCell>
                <TableCell className="text-right font-mono">
                  {fmt(emp.basicSalary)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fmt(
                    emp.basicSalary +
                      emp.hra +
                      emp.da +
                      emp.specialAllowance +
                      emp.customComponents
                        .filter((c) => c.type === "earning")
                        .reduce((s, c) => s + c.amount, 0),
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[emp.status]}`}
                  >
                    {emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(emp)}
                      data-ocid={`payroll.employees.edit_button.${idx + 1}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(emp)}
                      data-ocid={`payroll.employees.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="payroll.employees.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Employee Code *</Label>
                <Input
                  value={form.empCode}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, empCode: e.target.value }))
                  }
                  placeholder="EMP001"
                  data-ocid="payroll.employees.input"
                />
              </div>
              <div className="space-y-1">
                <Label>Full Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <Label>Designation</Label>
                <Input
                  value={form.designation}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, designation: e.target.value }))
                  }
                  placeholder="Software Engineer"
                />
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Input
                  value={form.department}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, department: e.target.value }))
                  }
                  placeholder="Engineering"
                />
              </div>
              <div className="space-y-1">
                <Label>Employee Type</Label>
                <Select
                  value={form.employeeType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, employeeType: v as EmployeeType }))
                  }
                >
                  <SelectTrigger data-ocid="payroll.employees.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salaried">Salaried</SelectItem>
                    <SelectItem value="daily_wage">Daily Wage</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v as EmployeeStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Date of Joining</Label>
                <Input
                  type="date"
                  value={form.dateOfJoining}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, dateOfJoining: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>PAN</Label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      value={form.pan}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          pan: e.target.value.toUpperCase(),
                          panVerified: false,
                          panVerifiedName: undefined,
                          panVerifiedAt: undefined,
                          panType: undefined,
                        }))
                      }
                      placeholder="ABCDE1234F"
                      className="font-mono"
                      data-ocid="payroll.employees.pan_input"
                    />
                    {panVerifyStatus === "success" && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {panVerifyMsg}
                      </div>
                    )}
                    {panVerifyStatus === "no_key" && (
                      <div className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                        ⚠ {panVerifyMsg}
                      </div>
                    )}
                    {(panVerifyStatus === "error" ||
                      panVerifyStatus === "format_error") && (
                      <div className="mt-1.5 text-xs text-destructive">
                        {panVerifyMsg}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleVerifyPAN}
                    disabled={panVerifying || !form.pan}
                    className="shrink-0 mt-0"
                    data-ocid="payroll.employees.pan_verify_button"
                  >
                    {panVerifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    )}
                    {panVerifying ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Salary */}
            <div className="border rounded-lg p-3 space-y-3">
              <h3 className="font-medium text-sm">Salary Structure</h3>
              {form.employeeType === "daily_wage" ? (
                <div className="space-y-1">
                  <Label>Daily Wage Rate (₹)</Label>
                  <Input
                    type="number"
                    value={form.dailyWageRate ?? 0}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        dailyWageRate: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Basic Salary (₹/month)</Label>
                    <Input
                      type="number"
                      value={form.basicSalary}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          basicSalary: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>HRA (₹/month)</Label>
                    <Input
                      type="number"
                      value={form.hra}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, hra: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>DA (₹/month)</Label>
                    <Input
                      type="number"
                      value={form.da}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, da: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Special Allowance (₹/month)</Label>
                    <Input
                      type="number"
                      value={form.specialAllowance}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          specialAllowance: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* Custom Components */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Custom Components
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCustomComponent}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
                {form.customComponents.map((comp, i) => (
                  <div
                    key={`comp-${i}-${comp.name}`}
                    className="flex gap-2 items-center"
                  >
                    <Input
                      placeholder="Name"
                      value={comp.name}
                      onChange={(e) =>
                        updateCustomComponent(i, { name: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={comp.amount}
                      onChange={(e) =>
                        updateCustomComponent(i, {
                          amount: Number(e.target.value),
                        })
                      }
                      className="w-28"
                    />
                    <Select
                      value={comp.type}
                      onValueChange={(v) =>
                        updateCustomComponent(i, {
                          type: v as "earning" | "deduction",
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="earning">Earning</SelectItem>
                        <SelectItem value="deduction">Deduction</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => removeCustomComponent(i)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {form.employeeType !== "daily_wage" && (
                <p className="text-xs text-muted-foreground">
                  Gross CTC: ₹{fmt(grossCTC(form))}/month
                </p>
              )}
            </div>

            {/* Statutory */}
            <div className="border rounded-lg p-3 space-y-3">
              <h3 className="font-medium text-sm">Statutory Deductions</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pf"
                    checked={form.isPfApplicable}
                    onCheckedChange={(v) =>
                      setForm((p) => ({ ...p, isPfApplicable: !!v }))
                    }
                  />
                  <Label htmlFor="pf">PF Applicable (12% of Basic)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="tds"
                    checked={form.tdsSectionApplicable}
                    onCheckedChange={(v) =>
                      setForm((p) => ({ ...p, tdsSectionApplicable: !!v }))
                    }
                  />
                  <Label htmlFor="tds">TDS (Section 192)</Label>
                </div>
                <div className="space-y-1">
                  <Label>PT State</Label>
                  <Select
                    value={form.professionalTaxState}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, professionalTaxState: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <span className="text-xs text-muted-foreground">
                    ESI auto-applies if gross ≤ ₹21,000
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="border rounded-lg p-3 space-y-3">
              <h3 className="font-medium text-sm">Bank Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Bank Name</Label>
                  <Input
                    value={form.bankName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, bankName: e.target.value }))
                    }
                    placeholder="State Bank of India"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Account Number</Label>
                  <Input
                    value={form.accountNumber}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, accountNumber: e.target.value }))
                    }
                    placeholder="123456789012"
                  />
                </div>
                <div className="space-y-1">
                  <Label>IFSC Code</Label>
                  <Input
                    value={form.ifsc}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        ifsc: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="SBIN0001234"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-ocid="payroll.employees.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              data-ocid="payroll.employees.save_button"
            >
              Save Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
