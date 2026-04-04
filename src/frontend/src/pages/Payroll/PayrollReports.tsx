import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmployees, usePayrollRuns } from "@/hooks/useGSTStore";
import { exportToCSV } from "@/utils/exportUtils";
import { BarChart3, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-IN");

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return `${MONTH_NAMES[Number.parseInt(mo) - 1]} ${y}`;
}

export function PayrollReports() {
  const { runs } = usePayrollRuns();
  const { employees } = useEmployees();

  const finalizedRuns = runs.filter((r) => r.status === "finalized");
  const allLines = finalizedRuns.flatMap((run) =>
    run.lines.map((line) => ({ ...line, month: run.month })),
  );

  // Salary Register export
  const exportSalaryRegister = () => {
    if (allLines.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportToCSV(
      allLines.map((l) => ({
        Month: monthLabel(l.month),
        "Emp Code": l.empCode,
        Name: l.employeeName,
        Basic: l.basicSalary,
        HRA: l.hra,
        DA: l.da,
        "Special Allowance": l.specialAllowance,
        "Other Earnings": l.otherEarnings,
        "Gross Salary": l.grossSalary,
        "LOP Days": l.lopDays,
        "LOP Deduction": l.lopDeduction,
        "Employee PF": l.employeePF,
        "Employee ESI": l.employeeESI,
        "Professional Tax": l.professionalTax,
        TDS: l.tdsDeduction,
        "Total Deductions": l.totalDeductions,
        "Net Pay": l.netPay,
      })),
      "Salary_Register",
    );
  };

  // PF/ESI summary per month
  const pfEsiByMonth = finalizedRuns.map((run) => ({
    month: run.month,
    empPF: run.lines.reduce((s, l) => s + l.employeePF, 0),
    emplrPF: run.totalEmployerPF,
    totalPF:
      run.lines.reduce((s, l) => s + l.employeePF, 0) + run.totalEmployerPF,
    empESI: run.lines.reduce((s, l) => s + l.employeeESI, 0),
    emplrESI: run.totalEmployerESI,
    totalESI:
      run.lines.reduce((s, l) => s + l.employeeESI, 0) + run.totalEmployerESI,
  }));

  const exportPFESI = () => {
    if (pfEsiByMonth.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportToCSV(
      pfEsiByMonth.map((r) => ({
        Month: monthLabel(r.month),
        "Employee PF": r.empPF,
        "Employer PF": r.emplrPF,
        "Total PF Challan": r.totalPF,
        "Employee ESI": r.empESI,
        "Employer ESI": r.emplrESI,
        "Total ESI Challan": r.totalESI,
      })),
      "PF_ESI_Summary",
    );
  };

  // TDS summary per employee
  const tdsByEmp = employees
    .map((emp) => {
      const empLines = allLines.filter((l) => l.employeeId === emp.id);
      const tdsYTD = empLines.reduce((s, l) => s + l.tdsDeduction, 0);
      const grossYTD = empLines.reduce((s, l) => s + l.grossSalary, 0);
      const annualProjection =
        grossYTD > 0 ? (grossYTD / empLines.length) * 12 : 0;
      return {
        emp,
        tdsYTD,
        grossYTD,
        annualProjection,
        months: empLines.length,
      };
    })
    .filter((r) => r.months > 0);

  const exportTDS = () => {
    if (tdsByEmp.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportToCSV(
      tdsByEmp.map((r) => ({
        "Emp Code": r.emp.empCode,
        Name: r.emp.name,
        PAN: r.emp.pan,
        "Months Processed": r.months,
        "Annual Projection": Math.round(r.annualProjection),
        "Taxable Income (est.)": Math.max(
          0,
          Math.round(r.annualProjection) - 250000,
        ),
        "TDS Deducted YTD": r.tdsYTD,
      })),
      "TDS_Summary",
    );
  };

  // CTC Report
  const ctcReport = employees.map((emp) => {
    const basic = emp.basicSalary;
    const hra = emp.hra;
    const da = emp.da;
    const sa = emp.specialAllowance;
    const custom = emp.customComponents
      .filter((c) => c.type === "earning")
      .reduce((s, c) => s + c.amount, 0);
    const gross = basic + hra + da + sa + custom;
    const emplrPF = emp.isPfApplicable ? Math.round(basic * 0.12) : 0;
    const emplrESI =
      emp.isEsiApplicable || gross <= 21000 ? Math.round(gross * 0.0325) : 0;
    const ctc = gross + emplrPF + emplrESI;
    return { emp, basic, hra, da, sa, custom, gross, emplrPF, emplrESI, ctc };
  });

  const exportCTC = () => {
    if (ctcReport.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportToCSV(
      ctcReport.map((r) => ({
        "Emp Code": r.emp.empCode,
        Name: r.emp.name,
        Designation: r.emp.designation,
        Department: r.emp.department,
        Basic: r.basic,
        HRA: r.hra,
        DA: r.da,
        "Special Allowance": r.sa,
        "Other Earnings": r.custom,
        "Gross Salary": r.gross,
        "Employer PF": r.emplrPF,
        "Employer ESI": r.emplrESI,
        "Total CTC": r.ctc,
      })),
      "CTC_Report",
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Payroll Reports</h1>
      </div>

      <Tabs defaultValue="salary-register">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="salary-register" data-ocid="payroll.reports.tab">
            Salary Register
          </TabsTrigger>
          <TabsTrigger value="pf-esi" data-ocid="payroll.reports.tab">
            PF/ESI Summary
          </TabsTrigger>
          <TabsTrigger value="tds" data-ocid="payroll.reports.tab">
            TDS Summary
          </TabsTrigger>
          <TabsTrigger value="ctc" data-ocid="payroll.reports.tab">
            CTC Report
          </TabsTrigger>
        </TabsList>

        {/* Salary Register */}
        <TabsContent value="salary-register" className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Monthly Salary Register</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={exportSalaryRegister}
              data-ocid="payroll.reports.primary_button"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          {allLines.length === 0 ? (
            <div
              className="text-center text-muted-foreground py-8"
              data-ocid="payroll.reports.empty_state"
            >
              No finalized payroll data.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allLines.map((l, i) => (
                    <TableRow
                      key={`${l.month}-${l.employeeId}-${i}`}
                      data-ocid={`payroll.reports.item.${i + 1}`}
                    >
                      <TableCell>{monthLabel(l.month)}</TableCell>
                      <TableCell>{l.employeeName}</TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{fmt(l.grossSalary)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        ₹{fmt(l.totalDeductions)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-700">
                        ₹{fmt(l.netPay)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* PF/ESI Summary */}
        <TabsContent value="pf-esi" className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">PF/ESI Contribution Summary</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={exportPFESI}
              data-ocid="payroll.reports.secondary_button"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          {pfEsiByMonth.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No PF/ESI data available.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Emp PF</TableHead>
                    <TableHead className="text-right">Employer PF</TableHead>
                    <TableHead className="text-right">Total PF</TableHead>
                    <TableHead className="text-right">Emp ESI</TableHead>
                    <TableHead className="text-right">Employer ESI</TableHead>
                    <TableHead className="text-right">Total ESI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pfEsiByMonth.map((r, i) => (
                    <TableRow
                      key={r.month}
                      data-ocid={`payroll.reports.item.${i + 1}`}
                    >
                      <TableCell>{monthLabel(r.month)}</TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{fmt(r.empPF)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{fmt(r.emplrPF)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ₹{fmt(r.totalPF)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{fmt(r.empESI)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{fmt(r.emplrESI)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ₹{fmt(r.totalESI)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* TDS Summary */}
        <TabsContent value="tds" className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">TDS Summary (Section 192)</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={exportTDS}
              data-ocid="payroll.reports.secondary_button"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          {tdsByEmp.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No TDS data available.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead className="text-right">
                      Annual Projection
                    </TableHead>
                    <TableHead className="text-right">Taxable Income</TableHead>
                    <TableHead className="text-right">TDS YTD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tdsByEmp.map((r, i) => (
                    <TableRow
                      key={r.emp.id}
                      data-ocid={`payroll.reports.item.${i + 1}`}
                    >
                      <TableCell>
                        <div className="font-medium">{r.emp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.emp.empCode}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-1">
                          {r.emp.pan || "-"}
                          {r.emp.panVerified && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{fmt(Math.round(r.annualProjection))}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₹
                        {fmt(
                          Math.max(0, Math.round(r.annualProjection) - 250000),
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ₹{fmt(r.tdsYTD)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* CTC Report */}
        <TabsContent value="ctc" className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Cost to Company (CTC) Report</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={exportCTC}
              data-ocid="payroll.reports.secondary_button"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          {ctcReport.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No employees found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Emplr PF</TableHead>
                    <TableHead className="text-right">Emplr ESI</TableHead>
                    <TableHead className="text-right font-bold">
                      Total CTC
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ctcReport.map((r, i) => (
                    <TableRow
                      key={r.emp.id}
                      data-ocid={`payroll.reports.item.${i + 1}`}
                    >
                      <TableCell>
                        <div className="font-medium">{r.emp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.emp.empCode}
                        </div>
                      </TableCell>
                      <TableCell>{r.emp.department}</TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{fmt(r.gross)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{fmt(r.emplrPF)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ₹{fmt(r.emplrESI)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        ₹{fmt(r.ctc)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary card */}
          {ctcReport.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Payroll Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  ₹{fmt(ctcReport.reduce((s, r) => s + r.ctc, 0))}
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
