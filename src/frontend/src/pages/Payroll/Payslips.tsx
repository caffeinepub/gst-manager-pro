import { Button } from "@/components/ui/button";
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
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useEmployees, usePayrollRuns } from "@/hooks/useGSTStore";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("en-IN");

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

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return `${MONTH_NAMES[Number.parseInt(mo) - 1]} ${y}`;
}

export function Payslips() {
  const { activeBusiness } = useBusinessContext();
  const { runs } = usePayrollRuns();
  const { employees } = useEmployees();
  const [filterEmp, setFilterEmp] = useState("");

  const finalizedRuns = runs.filter((r) => r.status === "finalized");
  const rows = finalizedRuns.flatMap((run) =>
    run.lines
      .filter((l) => !filterEmp || l.employeeId === filterEmp)
      .map((line) => ({ ...line, month: run.month, runId: run.id })),
  );

  const downloadPayslip = (runId: string, employeeId: string) => {
    const run = runs.find((r) => r.id === runId);
    if (!run) return;
    const line = run.lines.find((l) => l.employeeId === employeeId);
    if (!line) return;
    const emp = employees.find((e) => e.id === employeeId);

    const businessName = activeBusiness?.name ?? "Your Company";
    const address = "";

    const html = `
<!DOCTYPE html>
<html>
<head>
<title>Payslip - ${line.employeeName} - ${monthLabel(run.month)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; margin: 0; padding: 20px; }
  .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
  .company { font-size: 18pt; font-weight: bold; color: #1e3a5f; }
  .payslip-title { font-size: 13pt; font-weight: bold; margin: 8px 0; }
  .emp-details { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 16px; font-size: 10pt; }
  .emp-details div { padding: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #ccc; padding: 5px 8px; }
  th { background: #1e3a5f; color: white; }
  .total-row { font-weight: bold; background: #f0f4f8; }
  .net-pay { font-size: 14pt; font-weight: bold; color: #1e3a5f; text-align: right; margin-top: 12px; border-top: 2px solid #1e3a5f; padding-top: 8px; }
  @page { size: A4; margin: 0.5in; }
</style>
</head>
<body>
<div class="header">
  <div class="company">${businessName}</div>
  <div>${address}</div>
  <div class="payslip-title">SALARY SLIP - ${monthLabel(run.month)}</div>
</div>
<div class="emp-details">
  <div><b>Employee Name:</b> ${line.employeeName}</div>
  <div><b>Emp Code:</b> ${line.empCode}</div>
  <div><b>Designation:</b> ${emp?.designation || ""}</div>
  <div><b>Department:</b> ${emp?.department || ""}</div>
  <div><b>PAN:</b> ${emp?.pan || ""}${emp?.panVerified ? '<span style="color:#16a34a;font-size:9pt;"> ✓ Verified</span>' : ""}</div>
  <div><b>Bank:</b> ${emp?.bankName || ""}</div>
</div>
<table>
  <tr><th colspan="2">Earnings</th><th colspan="2">Deductions</th></tr>
  <tr><td>Basic Salary</td><td>&#8377;${fmt(line.basicSalary)}</td><td>Provident Fund (Employee)</td><td>&#8377;${fmt(line.employeePF)}</td></tr>
  <tr><td>HRA</td><td>&#8377;${fmt(line.hra)}</td><td>ESI (Employee)</td><td>&#8377;${fmt(line.employeeESI)}</td></tr>
  <tr><td>DA</td><td>&#8377;${fmt(line.da)}</td><td>Professional Tax</td><td>&#8377;${fmt(line.professionalTax)}</td></tr>
  <tr><td>Special Allowance</td><td>&#8377;${fmt(line.specialAllowance)}</td><td>TDS</td><td>&#8377;${fmt(line.tdsDeduction)}</td></tr>
  <tr><td>Other Earnings</td><td>&#8377;${fmt(line.otherEarnings)}</td><td>LOP Deduction (${line.lopDays} days)</td><td>&#8377;${fmt(line.lopDeduction)}</td></tr>
  <tr class="total-row"><td>Gross Salary</td><td>&#8377;${fmt(line.grossSalary)}</td><td>Total Deductions</td><td>&#8377;${fmt(line.totalDeductions)}</td></tr>
</table>
<div class="net-pay">NET PAY: &#8377;${fmt(line.netPay)}</div>
<p style="font-size:9pt; color:#666; margin-top:20px;">This is a computer-generated payslip and does not require a signature.</p>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Payslips</h1>
        </div>
        <Select value={filterEmp} onValueChange={setFilterEmp}>
          <SelectTrigger className="w-52" data-ocid="payroll.payslips.select">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 && (
        <div
          className="text-center text-muted-foreground py-12"
          data-ocid="payroll.payslips.empty_state"
        >
          No finalized payroll runs found. Process and finalize payroll first.
        </div>
      )}

      {finalizedRuns.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Emp Code</TableHead>
                <TableHead className="text-right">Gross (₹)</TableHead>
                <TableHead className="text-right">Deductions (₹)</TableHead>
                <TableHead className="text-right">Net Pay (₹)</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={`${row.runId}-${row.employeeId}`}
                  data-ocid={`payroll.payslips.item.${idx + 1}`}
                >
                  <TableCell className="font-medium">
                    {monthLabel(row.month)}
                  </TableCell>
                  <TableCell>{row.employeeName}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {row.empCode}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {fmt(row.grossSalary)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    {fmt(row.totalDeductions)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-green-700">
                    {fmt(row.netPay)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadPayslip(row.runId, row.employeeId)}
                      data-ocid={`payroll.payslips.download_button.${idx + 1}`}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
