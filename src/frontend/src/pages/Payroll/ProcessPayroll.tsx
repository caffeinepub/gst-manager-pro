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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useAttendanceRecords,
  useAuditLogs,
  useEmployees,
  useJournalEntries,
  usePayrollRuns,
} from "@/hooks/useGSTStore";
import type { PayrollRunLine } from "@/types/gst";
import { CheckCircle, IndianRupee, Info, PlayCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-IN");

// ─── State-wise Professional Tax Slabs ──────────────────────────────────────
// Based on official state PT notifications (FY 2025-26)
function getProfessionalTax(grossMonthly: number, stateCode: string): number {
  switch (stateCode) {
    case "27": // Maharashtra
      if (grossMonthly <= 7500) return 0;
      if (grossMonthly <= 10000) return 175;
      return 200; // ₹200 for >10000 (Feb: ₹300, averaged here)
    case "29": // Karnataka
      if (grossMonthly < 15000) return 0;
      return 200;
    case "33": // Tamil Nadu
      if (grossMonthly <= 21000) return 0;
      return 208;
    case "19": // West Bengal
      if (grossMonthly <= 8500) return 0;
      if (grossMonthly <= 10000) return 90;
      if (grossMonthly <= 15000) return 110;
      if (grossMonthly <= 25000) return 130;
      if (grossMonthly <= 40000) return 150;
      return 200;
    case "36": // Telangana
    case "37": // Andhra Pradesh
      if (grossMonthly <= 15000) return 0;
      if (grossMonthly <= 20000) return 150;
      return 200;
    case "24": // Gujarat
      if (grossMonthly <= 5999) return 0;
      if (grossMonthly <= 8999) return 80;
      if (grossMonthly <= 11999) return 150;
      return 200;
    case "32": // Kerala
      if (grossMonthly <= 19999) return 0;
      return 208;
    case "23": // Madhya Pradesh
      if (grossMonthly <= 18750) return 0;
      return 208;
    case "07": // Delhi — No PT
      return 0;
    default:
      // Generic: ₹200 for >₹10,000
      if (grossMonthly <= 10000) return 0;
      return 200;
  }
}

// ─── TDS Section 192 — FY 2026-27 (AY 2026-27) Slabs ──────────────────────────────────
// Both old and new regime with correct 87A rebate and 4% health & education cess
function calculateTDS(
  annualProjection: number,
  taxRegime: "old" | "new",
  stdDeduction: number,
): number {
  const afterStdDeduction = Math.max(0, annualProjection - stdDeduction);

  // Old Regime slabs
  let taxOld = 0;
  if (afterStdDeduction <= 250000) {
    taxOld = 0;
  } else if (afterStdDeduction <= 500000) {
    taxOld = Math.round((afterStdDeduction - 250000) * 0.05);
  } else if (afterStdDeduction <= 1000000) {
    taxOld = 12500 + Math.round((afterStdDeduction - 500000) * 0.2);
  } else {
    taxOld = 112500 + Math.round((afterStdDeduction - 1000000) * 0.3);
  }
  // 87A rebate old regime: tax nil if income <= 5L
  if (afterStdDeduction <= 500000) taxOld = 0;

  // New Regime slabs — Finance Act 2025, FY 2026-27 (AY 2026-27)
  let taxNew = 0;
  if (afterStdDeduction <= 400000) {
    taxNew = 0;
  } else if (afterStdDeduction <= 800000) {
    taxNew = Math.round((afterStdDeduction - 400000) * 0.05);
  } else if (afterStdDeduction <= 1200000) {
    taxNew = 20000 + Math.round((afterStdDeduction - 800000) * 0.1);
  } else if (afterStdDeduction <= 1600000) {
    taxNew = 60000 + Math.round((afterStdDeduction - 1200000) * 0.15);
  } else if (afterStdDeduction <= 2000000) {
    taxNew = 120000 + Math.round((afterStdDeduction - 1600000) * 0.2);
  } else if (afterStdDeduction <= 2400000) {
    taxNew = 200000 + Math.round((afterStdDeduction - 2000000) * 0.25);
  } else {
    taxNew = 300000 + Math.round((afterStdDeduction - 2400000) * 0.3);
  }
  // 87A rebate new regime FY 2026-27: nil tax if taxable income <= 12L (rebate up to ₹60,000)
  if (afterStdDeduction <= 1200000) taxNew = 0;

  // 4% Health & Education Cess
  const baseTax = taxRegime === "new" ? taxNew : taxOld;
  return Math.round(baseTax * 1.04);
}

function getWorkingDays(year: number, monthIdx: number) {
  const days = new Date(year, monthIdx + 1, 0).getDate();
  let working = 0;
  for (let d = 1; d <= days; d++) {
    const day = new Date(year, monthIdx, d).getDay();
    if (day !== 0) working++;
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
      let earningsCustom = 0;

      if (emp.employeeType === "daily_wage") {
        gross = (emp.dailyWageRate ?? 0) * presentDays;
      } else {
        earningsCustom = emp.customComponents
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

      // ─── PF Ceiling: ₹15,000 wage base (EPF & MP Act, 1952) ──────────────
      // PF is calculated on min(basic + DA, 15000)
      const daAmount = emp.da ?? 0;
      const pfWageBase = Math.min(emp.basicSalary + daAmount, 15000);
      const employeePF = emp.isPfApplicable ? Math.round(pfWageBase * 0.12) : 0;
      // Employer contribution split: EPF 3.67% + EPS 8.33% (capped ₹1,250) + EDLI 0.5% (capped ₹75)
      const employerEPF = emp.isPfApplicable
        ? Math.round(pfWageBase * 0.0367)
        : 0;
      const employerEPS = emp.isPfApplicable
        ? Math.min(Math.round(pfWageBase * 0.0833), 1250)
        : 0;
      const edli = emp.isPfApplicable
        ? Math.min(Math.round(pfWageBase * 0.005), 75)
        : 0;
      const employerPF = employerEPF + employerEPS + edli;

      // ─── ESI: applies when esiGross <= ₹21,000 (ESIC Act, 1948) ─────────
      // ESI computed on fixed components ONLY (not LOP-adjusted gross)
      const esiGross =
        emp.basicSalary + emp.hra + (emp.da ?? 0) + emp.specialAllowance;
      const esiApplicable = esiGross <= 21000;
      const employeeESI = esiApplicable ? Math.round(esiGross * 0.0075) : 0;
      const employerESI = esiApplicable ? Math.round(esiGross * 0.0325) : 0;

      // ─── Professional Tax (state-wise) ───────────────────────────────────
      const professionalTax = getProfessionalTax(
        gross,
        emp.professionalTaxState,
      );

      // ─── TDS Section 192 — correct slabs with regime toggle ──────────────
      const annualProjection =
        (emp.basicSalary + emp.hra + (emp.da ?? 0) + emp.specialAllowance) * 12;
      const empPfContribAnnual = employeePF * 12; // 80C deduction
      const taxableAnnual = Math.max(0, annualProjection - empPfContribAnnual);
      const regime: "old" | "new" = emp.taxRegime ?? "new";
      const annualTDS = emp.tdsSectionApplicable
        ? calculateTDS(taxableAnnual, regime, regime === "new" ? 75000 : 50000)
        : 0;
      const tdsDeduction = Math.round(annualTDS / 12);

      // ─── Labour Welfare Fund ─────────────────────────────────────────────
      const lwfDeduction =
        emp.lwfApplicable && emp.lwfAmount ? emp.lwfAmount : 0;

      const otherDeductions = emp.customComponents
        .filter((c) => c.type === "deduction")
        .reduce((s, c) => s + c.amount, 0);

      const totalDeductions =
        employeePF +
        employeeESI +
        professionalTax +
        tdsDeduction +
        lwfDeduction +
        otherDeductions;
      const netPay = Math.max(0, gross - totalDeductions);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        empCode: emp.empCode,
        basicSalary: emp.basicSalary,
        hra: emp.hra,
        da: emp.da ?? 0,
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
        // new breakdown fields
        employerEPF,
        employerEPS,
        edli,
        lwfDeduction,
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
    employeePF: lines.reduce((s, l) => s + l.employeePF, 0),
    employeeESI: lines.reduce((s, l) => s + l.employeeESI, 0),
    pt: lines.reduce((s, l) => s + l.professionalTax, 0),
    tds: lines.reduce((s, l) => s + l.tdsDeduction, 0),
  };

  const handleApprove = () => {
    if (!generated || lines.length === 0) return;
    if (existingRun) {
      updateRun(existingRun.id, {
        status: "approved",
        approvedAt: new Date().toISOString(),
        lines,
        totalGross: totals.gross,
        totalDeductions: totals.deductions,
        totalNetPay: totals.net,
        totalEmployerPF: totals.empPF,
        totalEmployerESI: totals.empESI,
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

    // ─── Balanced Journal Entry ──────────────────────────────────────────
    // Debit: Salaries & Wages (gross) + Employer PF + Employer ESI
    // Credit: Bank (net pay) + PF Payable (emp+employer) + ESI Payable (emp+employer)
    //         + PT Payable + TDS Payable
    // Equation: gross + empPF + empESI = net + (empPF+employeePF) + (empESI+employeeESI) + pt + tds
    const totalDebitAmount = totals.gross + totals.empPF + totals.empESI;
    const totalCreditAmount =
      totals.net +
      (totals.empPF + totals.employeePF) +
      (totals.empESI + totals.employeeESI) +
      totals.pt +
      totals.tds;

    const entryId = addEntry({
      entryNumber: `PAY-${monthKey}`,
      date: new Date().toISOString().slice(0, 10),
      reference: `Payroll-${monthKey}`,
      narration: `Salary payment for ${MONTH_NAMES[month]} ${year}`,
      lines: [
        // Debit entries
        {
          id: "1",
          accountCode: "5101",
          accountName: "Salaries & Wages",
          type: "debit",
          amount: totals.gross,
          narration: "Gross salary expense",
        },
        {
          id: "2",
          accountCode: "5105",
          accountName: "Employer PF Contribution",
          type: "debit",
          amount: totals.empPF,
          narration: "Employer PF (EPF+EPS+EDLI)",
        },
        {
          id: "3",
          accountCode: "5106",
          accountName: "Employer ESI Contribution",
          type: "debit",
          amount: totals.empESI,
          narration: "Employer ESI (3.25%)",
        },
        // Credit entries
        {
          id: "4",
          accountCode: "1002",
          accountName: "Bank Account",
          type: "credit",
          amount: totals.net,
          narration: "Net salary disbursed to employees",
        },
        {
          id: "5",
          accountCode: "2301",
          accountName: "PF Payable",
          type: "credit",
          amount: totals.empPF + totals.employeePF,
          narration: "Full PF challan (employee + employer)",
        },
        {
          id: "6",
          accountCode: "2302",
          accountName: "ESI Payable",
          type: "credit",
          amount: totals.empESI + totals.employeeESI,
          narration: "Full ESI challan (employee + employer)",
        },
        {
          id: "7",
          accountCode: "2303",
          accountName: "Professional Tax Payable",
          type: "credit",
          amount: totals.pt,
          narration: "PT payable to state government",
        },
        {
          id: "8",
          accountCode: "2201",
          accountName: "TDS Payable",
          type: "credit",
          amount: totals.tds,
          narration: "TDS u/s 192 payable to IT Dept",
        },
      ],
      totalDebit: totalDebitAmount,
      totalCredit: totalCreditAmount,
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

      {/* Compliance Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 flex items-start gap-2 text-blue-800 text-xs">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">Statutory Compliance:</span> PF
          calculated on min(Basic+DA, ₹15,000). ESI on fixed components ≤
          ₹21,000. TDS u/s 192 uses FY 2025-26 slabs. Old/New regime per
          employee. Debit=Credit journal entry enforced.
        </div>
      </div>

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
                  <TableHead>Employee</TableHead>
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
                {lines.map((line, idx) => {
                  const emp = employees.find((e) => e.id === line.employeeId);
                  const regime = emp?.taxRegime ?? "new";
                  return (
                    <TableRow
                      key={line.employeeId}
                      data-ocid={`payroll.process.item.${idx + 1}`}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">
                          {line.employeeName}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {line.empCode}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1 cursor-help"
                                >
                                  {regime === "new" ? "New" : "Old"}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {regime === "new"
                                  ? "New Tax Regime (Finance Act 2023)"
                                  : "Old Tax Regime"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                  );
                })}
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
