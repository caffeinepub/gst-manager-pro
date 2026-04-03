import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useAttendanceRecords,
  useAuditLogs,
  useEmployees,
  useJournalEntries,
  usePayrollRuns,
} from "@/hooks/useGSTStore";
import type { PayrollRunLine } from "@/types/gst";
import { CheckCircle, IndianRupee, PlayCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-IN");

// Professional Tax slabs (Maharashtra default, others ₹200 flat for 40001+)
function getProfessionalTax(grossMonthly: number, _stateCode: string): number {
  if (grossMonthly <= 10000) return 0;
  if (grossMonthly <= 15000) return 110;
  if (grossMonthly <= 25000) return 130;
  if (grossMonthly <= 40000) return 150;
  return 200;
}

function getWorkingDays(year: number, monthIdx: number) {
  // Approximate working days (Mon-Sat) in a month
  const days = new Date(year, monthIdx + 1, 0).getDate();
  let working = 0;
  for (let d = 1; d <= days; d++) {
    const day = new Date(year, monthIdx, d).getDay();
    if (day !== 0) working++; // exclude Sundays
  }
  return working;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function ProcessPayroll() {
  const { employees } = useEmployees();
  const { records } = useAttendanceRecords();
  const { runs, addRun, updateRun } = usePayrollRuns();
  const { addEntry } = useJournalEntries();
  const { addLog } = useAuditLogs();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [lines, setLines] = useState<PayrollRunLine[]>([]);
  const [generated, setGenerated] = useState(false);

  const monthKey = `${year}-${pad(month + 1)}`;
  const existingRun = runs.find((r) => r.month === monthKey);

  const generatePayroll = () => {
    const activeEmps = employees.filter((e) => e.status === "active");
    if (activeEmps.length === 0) {
      toast.error("No active employees found");
      return;
    }

    const workingDays = getWorkingDays(year, month);

    const computed: PayrollRunLine[] = activeEmps.map((emp) => {
      const attRec = records.find(
        (r) => r.employeeId === emp.id && r.month === monthKey,
      );
      const presentDays = attRec?.presentDays ?? workingDays;
      const lopDays = attRec?.lopDays ?? 0;

      let gross = 0;
      let lopDeduction = 0;

      if (emp.employeeType === "daily_wage") {
        gross = (emp.dailyWageRate ?? 0) * presentDays;
      } else {
        const earningsCustom = emp.customComponents
          .filter((c) => c.type === "earning")
          .reduce((s, c) => s + c.amount, 0);
        const deductionsCustom = emp.customComponents
          .filter((c) => c.type === "deduction")
          .reduce((s, c) => s + c.amount, 0);
        gross =
          emp.basicSalary +
          emp.hra +
          emp.da +
          emp.specialAllowance +
          earningsCustom;
        lopDeduction =
          workingDays > 0 ? Math.round((gross / workingDays) * lopDays) : 0;
        gross = gross - lopDeduction - deductionsCustom;
      }

      const employeePF = emp.isPfApplicable
        ? Math.round(emp.basicSalary * 0.12)
        : 0;
      const employerPF = emp.isPfApplicable
        ? Math.round(emp.basicSalary * 0.12)
        : 0;
      const esiGross =
        emp.basicSalary + emp.hra + emp.da + emp.specialAllowance;
      const employeeESI =
        emp.isEsiApplicable || esiGross <= 21000
          ? Math.round(gross * 0.0075)
          : 0;
      const employerESI =
        emp.isEsiApplicable || esiGross <= 21000
          ? Math.round(gross * 0.0325)
          : 0;
      const professionalTax = getProfessionalTax(
        gross,
        emp.professionalTaxState,
      );
      const annualProjection = gross * 12;
      const tdsDeduction =
        emp.tdsSectionApplicable && annualProjection > 500000
          ? Math.round(((annualProjection - 250000) * 0.1) / 12)
          : 0;

      const otherDeductions = emp.customComponents
        .filter((c) => c.type === "deduction")
        .reduce((s, c) => s + c.amount, 0);

      const totalDeductions =
        employeePF +
        employeeESI +
        professionalTax +
        tdsDeduction +
        otherDeductions;
      const netPay = Math.max(0, gross - totalDeductions);

      const earningsCustom = emp.customComponents
        .filter((c) => c.type === "earning")
        .reduce((s, c) => s + c.amount, 0);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        empCode: emp.empCode,
        basicSalary: emp.basicSalary,
        hra: emp.hra,
        da: emp.da,
        specialAllowance: emp.specialAllowance,
        otherEarnings: earningsCustom,
        grossSalary: gross,
        lopDays,
        lopDeduction,
        employeePF,
        employerPF,
        employeeESI,
        employerESI,
        professionalTax,
        tdsDeduction,
        otherDeductions,
        totalDeductions,
        netPay,
      };
    });

    setLines(computed);
    setGenerated(true);
    toast.success(`Payroll generated for ${computed.length} employee(s)`);
  };

  const totals = {
    gross: lines.reduce((s, l) => s + l.grossSalary, 0),
    deductions: lines.reduce((s, l) => s + l.totalDeductions, 0),
    net: lines.reduce((s, l) => s + l.netPay, 0),
    empPF: lines.reduce((s, l) => s + l.employerPF, 0),
    empESI: lines.reduce((s, l) => s + l.employerESI, 0),
  };

  const handleApprove = () => {
    if (!generated || lines.length === 0) return;
    if (existingRun) {
      updateRun(existingRun.id, {
        status: "approved",
        approvedAt: new Date().toISOString(),
        lines,
        ...totals,
      });
      toast.success("Payroll approved");
    } else {
      addRun({
        month: monthKey,
        status: "approved",
        lines,
        totalGross: totals.gross,
        totalDeductions: totals.deductions,
        totalNetPay: totals.net,
        totalEmployerPF: totals.empPF,
        totalEmployerESI: totals.empESI,
        approvedAt: new Date().toISOString(),
        notes: "",
      });
      toast.success("Payroll approved");
    }
  };

  const handleFinalize = () => {
    if (!generated || lines.length === 0) return;
    const runId = existingRun?.id;

    // Post journal entry
    const entryId = addEntry({
      entryNumber: `PAY-${monthKey}`,
      date: new Date().toISOString().slice(0, 10),
      reference: `Payroll-${monthKey}`,
      narration: `Salary payment for ${MONTH_NAMES[month]} ${year}`,
      lines: [
        {
          id: "1",
          accountCode: "5101",
          accountName: "Salaries & Wages",
          type: "debit",
          amount: totals.gross,
          narration: "Gross salary",
        },
        {
          id: "2",
          accountCode: "5105",
          accountName: "Employer PF Contribution",
          type: "debit",
          amount: totals.empPF,
          narration: "Employer PF",
        },
        {
          id: "3",
          accountCode: "5106",
          accountName: "Employer ESI Contribution",
          type: "debit",
          amount: totals.empESI,
          narration: "Employer ESI",
        },
        {
          id: "4",
          accountCode: "1002",
          accountName: "Bank Account",
          type: "credit",
          amount: totals.net,
          narration: "Net salary paid",
        },
        {
          id: "5",
          accountCode: "2301",
          accountName: "PF Payable",
          type: "credit",
          amount: totals.empPF + lines.reduce((s, l) => s + l.employeePF, 0),
          narration: "PF payable",
        },
        {
          id: "6",
          accountCode: "2302",
          accountName: "ESI Payable",
          type: "credit",
          amount: totals.empESI + lines.reduce((s, l) => s + l.employeeESI, 0),
          narration: "ESI payable",
        },
      ],
      totalDebit: totals.gross + totals.empPF + totals.empESI,
      totalCredit:
        totals.net +
        totals.empPF +
        lines.reduce((s, l) => s + l.employeePF, 0) +
        totals.empESI +
        lines.reduce((s, l) => s + l.employeeESI, 0),
    });

    if (runId) {
      updateRun(runId, {
        status: "finalized",
        journalEntryId: entryId,
        lines,
        totalGross: totals.gross,
        totalDeductions: totals.deductions,
        totalNetPay: totals.net,
        totalEmployerPF: totals.empPF,
        totalEmployerESI: totals.empESI,
      });
    } else {
      addRun({
        month: monthKey,
        status: "finalized",
        lines,
        totalGross: totals.gross,
        totalDeductions: totals.deductions,
        totalNetPay: totals.net,
        totalEmployerPF: totals.empPF,
        totalEmployerESI: totals.empESI,
        journalEntryId: entryId,
        approvedAt: new Date().toISOString(),
        notes: "",
      });
    }

    addLog({
      action: "approve",
      entity: "PayrollRun",
      entityId: monthKey,
      description: `Payroll finalized for ${MONTH_NAMES[month]} ${year}`,
    });
    toast.success("Payroll finalized. Journal entry posted.");
  };

  const runStatus = existingRun?.status;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Process Payroll</h1>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-24" data-ocid="payroll.process.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                today.getFullYear() - 1,
                today.getFullYear(),
                today.getFullYear() + 1,
              ].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(month)}
            onValueChange={(v) => {
              setMonth(Number(v));
              setGenerated(false);
              setLines([]);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={name} value={String(i)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {runStatus === "finalized" && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2 text-green-800 text-sm"
          data-ocid="payroll.process.success_state"
        >
          <CheckCircle className="w-4 h-4" />
          Payroll for {MONTH_NAMES[month]} {year} is already finalized.
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={generatePayroll}
          data-ocid="payroll.process.primary_button"
          disabled={runStatus === "finalized"}
        >
          <PlayCircle className="w-4 h-4 mr-1" /> Generate Payroll
        </Button>
        {generated && runStatus !== "finalized" && (
          <>
            <Button
              variant="outline"
              onClick={handleApprove}
              data-ocid="payroll.process.secondary_button"
            >
              Approve
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleFinalize}
              data-ocid="payroll.process.confirm_button"
            >
              Finalize & Post Journal
            </Button>
          </>
        )}
      </div>

      {generated && lines.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs text-muted-foreground">
                  Total Gross
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold">₹{fmt(totals.gross)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs text-muted-foreground">
                  Total Deductions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold text-red-600">
                  ₹{fmt(totals.deductions)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs text-muted-foreground">
                  Net Pay
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold text-green-600">
                  ₹{fmt(totals.net)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs text-muted-foreground">
                  Employer PF+ESI
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold">
                  ₹{fmt(totals.empPF + totals.empESI)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emp</TableHead>
                  <TableHead className="text-right">Basic</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">LOP</TableHead>
                  <TableHead className="text-right">Emp PF</TableHead>
                  <TableHead className="text-right">ESI</TableHead>
                  <TableHead className="text-right">PT</TableHead>
                  <TableHead className="text-right">TDS</TableHead>
                  <TableHead className="text-right">Total Ded.</TableHead>
                  <TableHead className="text-right font-bold">
                    Net Pay
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow
                    key={line.employeeId}
                    data-ocid={`payroll.process.item.${idx + 1}`}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">
                        {line.employeeName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {line.empCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(line.basicSalary)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(line.grossSalary)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-orange-600">
                      {line.lopDays > 0 ? `-${fmt(line.lopDeduction)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(line.employeePF)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(line.employeeESI)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(line.professionalTax)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(line.tdsDeduction)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600">
                      {fmt(line.totalDeductions)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-green-700">
                      {fmt(line.netPay)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Totals</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-mono">
                    {fmt(totals.gross)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right font-mono text-red-600">
                    {fmt(totals.deductions)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-700">
                    {fmt(totals.net)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {runStatus && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge
                variant={runStatus === "finalized" ? "default" : "secondary"}
              >
                {runStatus.charAt(0).toUpperCase() + runStatus.slice(1)}
              </Badge>
            </div>
          )}
        </>
      )}
    </div>
  );
}
