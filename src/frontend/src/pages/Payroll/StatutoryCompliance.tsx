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
import { useBusinessContext } from "@/hooks/useBusinessContext";
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

// ─── State-wise PT Reference Table ─────────────────────────────────────────
const STATE_PT_REFERENCE = [
  {
    state: "Maharashtra (27)",
    slabs: "₹0 (up to ₹7,500) | ₹175 (7,501–10,000) | ₹200 (>10,000)",
  },
  {
    state: "Karnataka (29)",
    slabs: "₹0 (up to ₹14,999) | ₹200 (>₹15,000)",
  },
  {
    state: "Tamil Nadu (33)",
    slabs: "₹0 (up to ₹21,000) | ₹208 (>₹21,000)",
  },
  {
    state: "West Bengal (19)",
    slabs:
      "₹0 (≤8,500) | ₹90 (8,501–10,000) | ₹110 (10,001–15,000) | ₹130 (15,001–25,000) | ₹150 (25,001–40,000) | ₹200 (>40,000)",
  },
  {
    state: "Telangana (36)",
    slabs: "₹0 (≤15,000) | ₹150 (15,001–20,000) | ₹200 (>20,000)",
  },
  {
    state: "Andhra Pradesh (37)",
    slabs: "₹0 (≤15,000) | ₹150 (15,001–20,000) | ₹200 (>20,000)",
  },
  {
    state: "Gujarat (24)",
    slabs:
      "₹0 (≤5,999) | ₹80 (6,000–8,999) | ₹150 (9,000–11,999) | ₹200 (>12,000)",
  },
  {
    state: "Kerala (32)",
    slabs: "₹0 (≤19,999) | ₹208 (≥20,000)",
  },
  {
    state: "Madhya Pradesh (23)",
    slabs: "₹0 (≤18,750) | ₹208 (>18,750)",
  },
  { state: "Delhi (07)", slabs: "Nil — No PT in Delhi" },
  { state: "Other States", slabs: "₹0 (≤10,000) | ₹200 (>10,000) [generic]" },
];

// ─── TDS Section 192 (reuse from ProcessPayroll) ───────────────────────────
function calculateTDS(
  annualProjection: number,
  taxRegime: "old" | "new",
  stdDeduction: number,
): number {
  const afterStd = Math.max(0, annualProjection - stdDeduction);

  let taxOld = 0;
  if (afterStd <= 250000) taxOld = 0;
  else if (afterStd <= 500000) taxOld = Math.round((afterStd - 250000) * 0.05);
  else if (afterStd <= 1000000)
    taxOld = 12500 + Math.round((afterStd - 500000) * 0.2);
  else taxOld = 112500 + Math.round((afterStd - 1000000) * 0.3);
  if (afterStd <= 500000) taxOld = 0;

  // New Regime slabs — Finance Act 2025, FY 2026-27 (AY 2026-27)
  let taxNew = 0;
  if (afterStd <= 400000) {
    taxNew = 0;
  } else if (afterStd <= 800000) {
    taxNew = Math.round((afterStd - 400000) * 0.05);
  } else if (afterStd <= 1200000) {
    taxNew = 20000 + Math.round((afterStd - 800000) * 0.1);
  } else if (afterStd <= 1600000) {
    taxNew = 60000 + Math.round((afterStd - 1200000) * 0.15);
  } else if (afterStd <= 2000000) {
    taxNew = 120000 + Math.round((afterStd - 1600000) * 0.2);
  } else if (afterStd <= 2400000) {
    taxNew = 200000 + Math.round((afterStd - 2000000) * 0.25);
  } else {
    taxNew = 300000 + Math.round((afterStd - 2400000) * 0.3);
  }
  // 87A rebate new regime FY 2026-27: nil tax if taxable income <= 12L (rebate up to ₹60,000)
  if (afterStd <= 1200000) taxNew = 0;

  const baseTax = taxRegime === "new" ? taxNew : taxOld;
  return Math.round(baseTax * 1.04);
}

export function StatutoryCompliance() {
  const { activeBusiness } = useBusinessContext();
  const { runs } = usePayrollRuns();
  const { employees } = useEmployees();

  const finalizedRuns = runs.filter((r) => r.status === "finalized");
  const latestRun = finalizedRuns[0];

  // ─── PF Data: EPF, EPS, EDLI correctly split ──────────────────────────────
  const pfData = finalizedRuns.map((run) => {
    const empPF = run.lines.reduce((s, l) => s + l.employeePF, 0);
    const emplrPF = run.totalEmployerPF;
    const basicTotal = run.lines.reduce((s, l) => s + l.basicSalary, 0);
    const adminCharges = Math.round(basicTotal * 0.005);
    // EDLI cap is ₹75 PER employee, then summed — not applied on total
    const edli = run.lines.reduce((s, l) => {
      const pfBase = Math.min(l.basicSalary + (l.da ?? 0), 15000);
      return s + Math.min(Math.round(pfBase * 0.005), 75);
    }, 0);
    // EPF and EPS split for display
    const epf = run.lines.reduce(
      (s, l) =>
        s +
        (l.employerEPF ??
          Math.round(Math.min(l.basicSalary + (l.da ?? 0), 15000) * 0.0367)),
      0,
    );
    const eps = run.lines.reduce(
      (s, l) =>
        s +
        (l.employerEPS ??
          Math.min(
            Math.round(Math.min(l.basicSalary + (l.da ?? 0), 15000) * 0.0833),
            1250,
          )),
      0,
    );
    return {
      month: run.month,
      empPF,
      emplrPF,
      epf,
      eps,
      edli,
      totalPF: empPF + emplrPF,
      adminCharges,
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

  // ─── TDS projection: correct slabs per regime ───────────────────────────────
  const tdsData = employees
    .map((emp) => {
      const empLines = finalizedRuns.flatMap((r) =>
        r.lines.filter((l) => l.employeeId === emp.id),
      );
      if (empLines.length === 0) return null;
      const grossYTD = empLines.reduce((s, l) => s + l.grossSalary, 0);
      const avgMonthly = grossYTD / empLines.length;
      const annualProj = avgMonthly * 12;
      const regime: "old" | "new" = emp.taxRegime ?? "new";
      const estimatedTax = calculateTDS(
        annualProj,
        regime,
        regime === "new" ? 75000 : 50000,
      );
      const monthlyTDS = Math.round(estimatedTax / 12);
      const tdsYTD = empLines.reduce((s, l) => s + l.tdsDeduction, 0);
      const afterStd = Math.max(
        0,
        annualProj - (regime === "new" ? 75000 : 50000),
      );
      return {
        emp,
        grossYTD,
        annualProj,
        taxableIncome: afterStd,
        estimatedTax,
        monthlyTDS,
        tdsYTD,
        regime,
      };
    })
    .filter(Boolean);

  const generateChallan = (type: string, month: string) => {
    const pfRow = pfData.find((d) => d.month === month);
    const esiRow = esiData.find((d) => d.month === month);
    const data = pfRow || esiRow;
    if (!data) {
      toast.error("No data for selected month");
      return;
    }

    const businessName = activeBusiness?.name ?? "Your Company";

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
<div style="font-size:13pt;font-weight:bold;margin:8px 0;">${type} CHALLAN - ${monthLabel(month)}</div>
<span class="demo-badge">⚠ SIMULATION ONLY — NOT FOR SUBMISSION</span>
</div>
<p>This challan is generated for demonstration purposes only. Do not submit to ${type === "PF" ? "EPFO" : type === "ESI" ? "ESIC" : "State Government"} without verification.</p>
<table><tr><th>Description</th><th>Amount (₹)</th></tr>
${
  type === "PF" && pfRow
    ? `
<tr><td>Employee PF (12% of capped basic)</td><td>${fmt(pfRow.empPF)}</td></tr>
<tr><td>Employer EPF (3.67% of capped basic)</td><td>${fmt(pfRow.epf)}</td></tr>
<tr><td>Employer EPS (8.33%, max ₹1,250)</td><td>${fmt(pfRow.eps)}</td></tr>
<tr><td>EDLI Charges (0.5%, max ₹75/emp)</td><td>${fmt(pfRow.edli)}</td></tr>
<tr><td>Admin Charges (0.5%)</td><td>${fmt(pfRow.adminCharges)}</td></tr>
<tr style="font-weight:bold;"><td>Total PF Challan</td><td>${fmt(pfRow.challan)}</td></tr>
`
    : esiRow
      ? `
<tr><td>Employee ESI (0.75%)</td><td>${fmt(esiRow.empESI)}</td></tr>
<tr><td>Employer ESI (3.25%)</td><td>${fmt(esiRow.emplrESI)}</td></tr>
<tr style="font-weight:bold;"><td>Total ESI Challan</td><td>${fmt(esiRow.totalESI)}</td></tr>
`
      : ""
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

      {/* Section 1: PF with EPF / EPS / EDLI split */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base border-b pb-2">
          Section 1: Provident Fund (EPF Act, 1952)
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
                  <TableHead className="text-right">Emp PF (12%)</TableHead>
                  <TableHead className="text-right">EPF (3.67%)</TableHead>
                  <TableHead className="text-right">EPS (8.33%)</TableHead>
                  <TableHead className="text-right">EDLI (0.5%)</TableHead>
                  <TableHead className="text-right">Admin (0.5%)</TableHead>
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
                      ₹{fmt(d.epf)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{fmt(d.eps)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{fmt(d.edli)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{fmt(d.adminCharges)}
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
        <p className="text-xs text-muted-foreground">
          * PF wage base capped at ₹15,000/month (EPF & MP Act, 1952). EPF =
          3.67%, EPS = 8.33% (max ₹1,250), EDLI = 0.5% (max ₹75/employee).
        </p>
      </section>

      {/* Section 2: ESI */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base border-b pb-2">
          Section 2: ESI Contributions (ESIC Act, 1948)
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
        <p className="text-xs text-muted-foreground">
          * ESI applicable when gross (fixed components) ≤ ₹21,000/month.
          Computed on fixed salary (Basic + HRA + DA + Special Allowance).
        </p>
      </section>

      {/* Section 3: Professional Tax — multi-state table */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base border-b pb-2">
          Section 3: Professional Tax (State-wise)
        </h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              State-wise PT Slabs Reference (FY 2025-26)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>State</TableHead>
                    <TableHead>PT Slabs (Monthly Gross)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STATE_PT_REFERENCE.map((row) => (
                    <TableRow key={row.state}>
                      <TableCell className="font-medium text-sm">
                        {row.state}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.slabs}
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

      {/* Section 4: TDS Section 192 with correct regime display */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base border-b pb-2">
          Section 4: TDS — Section 192 (FY 2025-26)
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
                  <TableHead>Regime</TableHead>
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
                        <TableCell>
                          <Badge
                            variant={
                              r.regime === "new" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {r.regime === "new" ? "New" : "Old"}
                          </Badge>
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
        <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
          <span className="font-semibold">
            Section 192 TDS — FY 2026-27 (AY 2026-27) Slab Rates:
          </span>{" "}
          <strong>New Regime (Default):</strong> Nil ≤₹4L; 5% ₹4–8L; 10% ₹8–12L;
          15% ₹12–16L; 20% ₹16–20L; 25% ₹20–24L; 30% &gt;₹24L. 87A rebate
          (₹60,000) if taxable income ≤₹12L. Std deduction ₹75,000. 4% Health &
          Education Cess. <strong>Old Regime:</strong> Nil ≤₹2.5L; 5% ₹2.5–5L;
          20% ₹5–10L; 30% &gt;₹10L. 87A rebate (₹12,500) if income ≤₹5L. Std
          deduction ₹50,000. 4% Cess.
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
