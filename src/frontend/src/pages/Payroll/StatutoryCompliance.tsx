import { Badge } from "@/components/ui/badge";
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
import { useEmployees, usePayrollRuns } from "@/hooks/useGSTStore";
import { ShieldCheck } from "lucide-react";
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

const PT_SLABS = [
  { from: 0, to: 10000, pt: 0 },
  { from: 10001, to: 15000, pt: 110 },
  { from: 15001, to: 25000, pt: 130 },
  { from: 25001, to: 40000, pt: 150 },
  { from: 40001, to: Number.POSITIVE_INFINITY, pt: 200 },
];

export function StatutoryCompliance() {
  const { runs } = usePayrollRuns();
  const { employees } = useEmployees();

  const finalizedRuns = runs.filter((r) => r.status === "finalized");
  const latestRun = finalizedRuns[0];

  const pfData = finalizedRuns.map((run) => {
    const empPF = run.lines.reduce((s, l) => s + l.employeePF, 0);
    const emplrPF = run.totalEmployerPF;
    const basicTotal = run.lines.reduce((s, l) => s + l.basicSalary, 0);
    const adminCharges = Math.round(basicTotal * 0.005);
    const edli = Math.min(
      Math.round(basicTotal * 0.005),
      75 * run.lines.length,
    );
    return {
      month: run.month,
      empPF,
      emplrPF,
      totalPF: empPF + emplrPF,
      adminCharges,
      edli,
      challan: empPF + emplrPF + adminCharges + edli,
    };
  });

  const esiData = finalizedRuns.map((run) => {
    const empESI = run.lines.reduce((s, l) => s + l.employeeESI, 0);
    const emplrESI = run.totalEmployerESI;
    return { month: run.month, empESI, emplrESI, totalESI: empESI + emplrESI };
  });

  const ptData = finalizedRuns.map((run) => {
    const ptTotal = run.lines.reduce((s, l) => s + l.professionalTax, 0);
    return { month: run.month, ptTotal, count: run.lines.length };
  });

  // TDS projection per employee
  const tdsData = employees
    .map((emp) => {
      const empLines = finalizedRuns.flatMap((r) =>
        r.lines.filter((l) => l.employeeId === emp.id),
      );
      if (empLines.length === 0) return null;
      const grossYTD = empLines.reduce((s, l) => s + l.grossSalary, 0);
      const avgMonthly = grossYTD / empLines.length;
      const annualProj = avgMonthly * 12;
      const stdDeduction = 50000;
      const taxableIncome = Math.max(0, annualProj - stdDeduction);
      const estimatedTax =
        taxableIncome > 500000 ? Math.round((taxableIncome - 250000) * 0.1) : 0;
      const monthlyTDS = Math.round(estimatedTax / 12);
      const tdsYTD = empLines.reduce((s, l) => s + l.tdsDeduction, 0);
      return {
        emp,
        grossYTD,
        annualProj,
        taxableIncome,
        estimatedTax,
        monthlyTDS,
        tdsYTD,
      };
    })
    .filter(Boolean);

  const generateChallan = (type: string, month: string) => {
    const data =
      pfData.find((d) => d.month === month) ||
      esiData.find((d) => d.month === month);
    if (!data) {
      toast.error("No data for selected month");
      return;
    }

    const profile = (() => {
      try {
        return JSON.parse(localStorage.getItem("gst_business_profile") || "{}");
      } catch {
        return {};
      }
    })();
    const businessName = profile.businessName || profile.name || "Your Company";

    const html = `
<!DOCTYPE html><html><head><title>${type} Challan - ${monthLabel(month)}</title>
<style>body{font-family:Arial,sans-serif;padding:20px;font-size:11pt;}
.header{text-align:center;border-bottom:2px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px;}
.company{font-size:18pt;font-weight:bold;color:#1e3a5f;}
 table{width:100%;border-collapse:collapse;margin-top:12px;}
th,td{border:1px solid #ccc;padding:6px 10px;}
th{background:#1e3a5f;color:white;}
.demo-badge{background:#ff4444;color:white;padding:4px 10px;border-radius:4px;font-size:9pt;}
@page{size:A4;margin:0.5in;}</style></head><body>
<div class="header">
<div class="company">${businessName}</div>
<div class="payslip-title" style="font-size:13pt;font-weight:bold;margin:8px 0;">${type} CHALLAN - ${monthLabel(month)}</div>
<span class="demo-badge">⚠ SIMULATION ONLY — NOT FOR SUBMISSION</span>
</div>
<p>This challan is generated for demonstration purposes only. Do not submit to ${type === "PF" ? "EPFO" : type === "ESI" ? "ESIC" : "State Government"} without verification.</p>
<table><tr><th>Description</th><th>Amount (₹)</th></tr>
${
  type === "PF"
    ? `
<tr><td>Employee PF (12% of Basic)</td><td>${fmt(pfData.find((d) => d.month === month)?.empPF ?? 0)}</td></tr>
<tr><td>Employer PF (12% of Basic)</td><td>${fmt(pfData.find((d) => d.month === month)?.emplrPF ?? 0)}</td></tr>
<tr><td>Admin Charges (0.5%)</td><td>${fmt(pfData.find((d) => d.month === month)?.adminCharges ?? 0)}</td></tr>
<tr><td>EDLI Charges (0.5%, max ₹75/emp)</td><td>${fmt(pfData.find((d) => d.month === month)?.edli ?? 0)}</td></tr>
<tr style="font-weight:bold;"><td>Total PF Challan</td><td>${fmt(pfData.find((d) => d.month === month)?.challan ?? 0)}</td></tr>
`
    : `
<tr><td>Employee ESI (0.75%)</td><td>${fmt(esiData.find((d) => d.month === month)?.empESI ?? 0)}</td></tr>
<tr><td>Employer ESI (3.25%)</td><td>${fmt(esiData.find((d) => d.month === month)?.emplrESI ?? 0)}</td></tr>
<tr style="font-weight:bold;"><td>Total ESI Challan</td><td>${fmt(esiData.find((d) => d.month === month)?.totalESI ?? 0)}</td></tr>
`
}
</table>
<p style="font-size:9pt;color:#888;margin-top:20px;">Generated on ${new Date().toLocaleString("en-IN")}</p>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Popup blocked");
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
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Statutory Compliance</h1>
        <Badge
          variant="outline"
          className="text-orange-600 border-orange-300 bg-orange-50"
        >
          Demo Mode
        </Badge>
      </div>

      {/* PF Compliance */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base border-b pb-2">
          Section 1: Provident Fund (PF)
        </h2>
        {pfData.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No PF data. Finalize payroll to generate PF summary.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Emp PF</TableHead>
                  <TableHead className="text-right">Employer PF</TableHead>
                  <TableHead className="text-right">Admin (0.5%)</TableHead>
                  <TableHead className="text-right">EDLI</TableHead>
                  <TableHead className="text-right font-bold">
                    Challan Total
                  </TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pfData.map((d, i) => (
                  <TableRow
                    key={d.month}
                    data-ocid={`payroll.statutory.item.${i + 1}`}
                  >
                    <TableCell>{monthLabel(d.month)}</TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{fmt(d.empPF)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{fmt(d.emplrPF)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{fmt(d.adminCharges)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{fmt(d.edli)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      ₹{fmt(d.challan)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateChallan("PF", d.month)}
                        data-ocid="payroll.statutory.primary_button"
                      >
                        Print Challan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* ESI Compliance */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base border-b pb-2">
          Section 2: ESI Contributions
        </h2>
        {esiData.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No ESI data. Finalize payroll to generate ESI summary.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Emp ESI (0.75%)</TableHead>
                  <TableHead className="text-right">
                    Employer ESI (3.25%)
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    Total Challan
                  </TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {esiData.map((d, i) => (
                  <TableRow
                    key={d.month}
                    data-ocid={`payroll.statutory.item.${i + 1}`}
                  >
                    <TableCell>{monthLabel(d.month)}</TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{fmt(d.empESI)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{fmt(d.emplrESI)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      ₹{fmt(d.totalESI)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateChallan("ESI", d.month)}
                        data-ocid="payroll.statutory.secondary_button"
                      >
                        Print Challan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Professional Tax */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base border-b pb-2">
          Section 3: Professional Tax
        </h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              State-Wise PT Slabs (Standard)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gross Salary Range</TableHead>
                    <TableHead className="text-right">
                      PT Per Month (₹)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PT_SLABS.map((slab) => (
                    <TableRow key={`slab-${slab.from}`}>
                      <TableCell>
                        ₹{fmt(slab.from)} –{" "}
                        {slab.to === Number.POSITIVE_INFINITY
                          ? "Above"
                          : `₹${fmt(slab.to)}`}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {slab.pt === 0 ? "Nil" : `₹${slab.pt}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        {ptData.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">PT Collected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ptData.map((d, i) => (
                  <TableRow
                    key={d.month}
                    data-ocid={`payroll.statutory.item.${i + 1}`}
                  >
                    <TableCell>{monthLabel(d.month)}</TableCell>
                    <TableCell className="text-right">{d.count}</TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{fmt(d.ptTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* TDS Section 192 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base border-b pb-2">
          Section 4: TDS (Section 192)
        </h2>
        {tdsData.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No TDS data. Finalize payroll with TDS-applicable employees to see
            projections.
          </p>
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
                  <TableHead className="text-right">Std. Deduction</TableHead>
                  <TableHead className="text-right">Taxable Income</TableHead>
                  <TableHead className="text-right">Est. Tax</TableHead>
                  <TableHead className="text-right">Monthly TDS</TableHead>
                  <TableHead className="text-right">TDS YTD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tdsData.map(
                  (r, i) =>
                    r && (
                      <TableRow
                        key={r.emp.id}
                        data-ocid={`payroll.statutory.item.${i + 1}`}
                      >
                        <TableCell>
                          <div className="font-medium">{r.emp.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.emp.empCode}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {r.emp.pan || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{fmt(Math.round(r.annualProj))}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{fmt(50000)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{fmt(r.taxableIncome)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{fmt(r.estimatedTax)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{fmt(r.monthlyTDS)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ₹{fmt(r.tdsYTD)}
                        </TableCell>
                      </TableRow>
                    ),
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          * Standard deduction ₹50,000 applied. Basic exemption limit ₹2,50,000.
          Tax rate 10% on income above exemption. This is a simplified
          calculation for reference only.
        </p>
      </section>

      {latestRun && (
        <p className="text-xs text-muted-foreground border-t pt-3">
          Data based on {finalizedRuns.length} finalized payroll run(s). Last:{" "}
          {monthLabel(latestRun.month)}.
        </p>
      )}
    </div>
  );
}
