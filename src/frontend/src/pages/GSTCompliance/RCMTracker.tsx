import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAuditLogs,
  useBizConfig,
  useJournalEntries,
  usePurchases,
} from "@/hooks/useGSTStore";
import { formatDate, formatINR } from "@/utils/formatting";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  PiggyBank,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// Section 9(3) CGST Act — Notified RCM Categories
const RCM_CATEGORIES_9_3 = [
  "Goods Transport Agency (GTA) services",
  "Legal services by advocate / firm of advocates",
  "Services by arbitral tribunal",
  "Services supplied by Government / local authority (excluding specific)",
  "Services supplied by a director to a company / body corporate",
  "Services by insurance agent to insurance company",
  "Services by recovery agent to banking company",
  "Author / music composer / photographer / artist to publisher",
  "Import of services from a related person or establishment outside India",
  "Renting / leasing of motor vehicles (by non-GST registered person)",
  "Services by business facilitator to banking company",
  "Services by an agent of business correspondent to business correspondent",
];

export function RCMTracker() {
  const { purchases } = usePurchases();
  const [paidRcm, setPaidRcmRaw] = useBizConfig<string[]>("rcm_paid_ids", []);
  const setPaidRcm = (updater: string[] | ((prev: string[]) => string[])) => {
    const next = typeof updater === "function" ? updater(paidRcm) : updater;
    setPaidRcmRaw(next);
  };
  const { addLog } = useAuditLogs();
  const { addEntry } = useJournalEntries();
  const [rcmInfoOpen, setRcmInfoOpen] = useState(false);

  const rcmPurchases = useMemo(
    () => purchases.filter((p) => p.isRcm && p.status === "confirmed"),
    [purchases],
  );

  const totals = useMemo(
    () => ({
      cgst: rcmPurchases.reduce((s, p) => s + p.totalCgst, 0),
      sgst: rcmPurchases.reduce((s, p) => s + p.totalSgst, 0),
      igst: rcmPurchases.reduce((s, p) => s + p.totalIgst, 0),
      total: rcmPurchases.reduce(
        (s, p) => s + p.totalCgst + p.totalSgst + p.totalIgst,
        0,
      ),
    }),
    [rcmPurchases],
  );

  const paidCount = rcmPurchases.filter((p) => paidRcm.includes(p.id)).length;
  const pendingCount = rcmPurchases.length - paidCount;

  const markPaid = (purchaseId: string) => {
    const purchase = rcmPurchases.find((p) => p.id === purchaseId);
    if (!purchase) return;

    const rcmTax = purchase.totalCgst + purchase.totalSgst + purchase.totalIgst;

    // Post balanced journal entry: RCM Tax Payables Dr / Bank Cr
    addEntry({
      entryNumber: `RCM-${purchaseId.slice(-6)}`,
      date: new Date().toISOString().slice(0, 10),
      reference: purchase.billNumber,
      narration: `RCM tax payment for ${purchase.vendorName}`,
      lines: [
        {
          id: `rcm-${Date.now()}-1`,
          accountCode: "2101",
          accountName: "GST Payable - CGST",
          type: "debit" as const,
          amount: purchase.totalCgst,
          narration: "RCM CGST",
        },
        {
          id: `rcm-${Date.now()}-2`,
          accountCode: "2102",
          accountName: "GST Payable - SGST",
          type: "debit" as const,
          amount: purchase.totalSgst,
          narration: "RCM SGST",
        },
        {
          id: `rcm-${Date.now()}-3`,
          accountCode: "2103",
          accountName: "GST Payable - IGST",
          type: "debit" as const,
          amount: purchase.totalIgst,
          narration: "RCM IGST",
        },
        {
          id: `rcm-${Date.now()}-4`,
          accountCode: "1002",
          accountName: "Bank Account",
          type: "credit" as const,
          amount: rcmTax,
          narration: "RCM tax paid via bank",
        },
      ],
      totalDebit: rcmTax,
      totalCredit: rcmTax,
    });

    setPaidRcm((prev) =>
      prev.includes(purchaseId) ? prev : [...prev, purchaseId],
    );
    addLog({
      action: "approve",
      entity: "RCM",
      entityId: purchaseId,
      description: "RCM tax paid and journal entry posted",
    });
    toast.success("RCM tax paid. Journal entry posted.");
  };

  return (
    <div className="space-y-4" data-ocid="rcm.section">
      {/* Section 9(3) Reference Panel */}
      <Collapsible open={rcmInfoOpen} onOpenChange={setRcmInfoOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100"
            data-ocid="rcm.info.toggle"
          >
            <Info className="w-3.5 h-3.5" />
            Section 9(3) Notified RCM Categories
            {rcmInfoOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="bg-blue-50/60 border-blue-200 mt-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-800">
                Section 9(3) of CGST Act — Supplies Liable to RCM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-1">
                {RCM_CATEGORIES_9_3.map((cat) => (
                  <li key={cat} className="text-xs text-blue-900">
                    {cat}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-blue-700 mt-3 italic">
                Reference only. Refer to CGST Notification No. 13/2017-CT (Rate)
                and subsequent amendments for current applicability.
              </p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Summary Cards — CGST, SGST, IGST, Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">RCM CGST Payable</p>
            <p className="text-xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(totals.cgst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">RCM SGST Payable</p>
            <p className="text-xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(totals.sgst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">RCM IGST Payable</p>
            <p className="text-xl font-cabinet font-bold text-chart-2 font-numeric">
              {formatINR(totals.igst)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pending Payment</p>
            <p className="text-xl font-cabinet font-bold text-chart-4 font-numeric">
              {pendingCount}
            </p>
            <p className="text-xs text-muted-foreground">
              of {rcmPurchases.length} bills ({paidCount} paid)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-primary" />
            RCM Transactions ({rcmPurchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rcmPurchases.length === 0 ? (
            <div
              className="p-8 text-center text-sm text-muted-foreground"
              data-ocid="rcm.empty_state"
            >
              No RCM transactions found. Mark purchases as RCM in Accounting
              &gt; Purchases.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="rcm.list.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">CGST (RCM)</TableHead>
                    <TableHead className="text-right">SGST (RCM)</TableHead>
                    <TableHead className="text-right">IGST (RCM)</TableHead>
                    <TableHead className="text-right">Total Tax</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rcmPurchases.map((p, idx) => {
                    const isPaid = paidRcm.includes(p.id);
                    const rcmTax = p.totalCgst + p.totalSgst + p.totalIgst;
                    return (
                      <TableRow key={p.id} data-ocid={`rcm.item.${idx + 1}`}>
                        <TableCell className="pl-4 font-mono text-xs text-primary">
                          {p.billNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.vendorName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(p.billDate)}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-sm">
                          {formatINR(p.totalCgst)}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-sm">
                          {formatINR(p.totalSgst)}
                        </TableCell>
                        <TableCell className="text-right font-numeric text-sm">
                          {formatINR(p.totalIgst)}
                        </TableCell>
                        <TableCell className="text-right font-numeric font-bold">
                          {formatINR(rcmTax)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {isPaid ? (
                            <Badge
                              variant="default"
                              className="text-xs bg-chart-2 hover:bg-chart-2 gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Tax Paid
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => markPaid(p.id)}
                              data-ocid={`rcm.mark_paid.button.${idx + 1}`}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        ℹ️ Clicking "Mark Paid" posts a balanced journal entry: GST Payable Dr /
        Bank Cr.
      </p>
    </div>
  );
}
