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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePurchases } from "@/hooks/useGSTStore";
import { formatDate, formatINR } from "@/utils/formatting";
import { Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type MatchStatus = "Matched" | "Mismatched" | "Pending";

interface GSTR2BEntry {
  id: string;
  vendorGstin: string;
  invoiceNo: string;
  date: string;
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  matchStatus: MatchStatus;
}

const SYNTHETIC_PORTAL_DATA: GSTR2BEntry[] = [
  {
    id: "p1",
    vendorGstin: "27AABCU9603R1ZX",
    invoiceNo: "BILL0001",
    date: "2026-02-05",
    taxable: 45000,
    igst: 0,
    cgst: 4050,
    sgst: 4050,
    matchStatus: "Matched",
  },
  {
    id: "p2",
    vendorGstin: "29GGGGG1314R9Z6",
    invoiceNo: "PUR-2026-112",
    date: "2026-02-08",
    taxable: 28000,
    igst: 5040,
    cgst: 0,
    sgst: 0,
    matchStatus: "Matched",
  },
  {
    id: "p3",
    vendorGstin: "33BBBFF5431M2RK",
    invoiceNo: "VND-4521",
    date: "2026-02-14",
    taxable: 15000,
    igst: 0,
    cgst: 900,
    sgst: 900,
    matchStatus: "Mismatched",
  },
  {
    id: "p4",
    vendorGstin: "07AAACT2727Q1ZV",
    invoiceNo: "PO-7781",
    date: "2026-02-19",
    taxable: 60000,
    igst: 10800,
    cgst: 0,
    sgst: 0,
    matchStatus: "Pending",
  },
  {
    id: "p5",
    vendorGstin: "24AAACP7955P1ZV",
    invoiceNo: "BILL-033",
    date: "2026-02-22",
    taxable: 8500,
    igst: 0,
    cgst: 765,
    sgst: 765,
    matchStatus: "Matched",
  },
];

function getMatchBadge(status: MatchStatus) {
  switch (status) {
    case "Matched":
      return (
        <Badge
          variant="default"
          className="text-xs bg-green-600 hover:bg-green-700"
        >
          Matched
        </Badge>
      );
    case "Mismatched":
      return (
        <Badge variant="destructive" className="text-xs">
          Mismatched
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          Pending
        </Badge>
      );
  }
}

export function ITCReconciliation() {
  const { purchases } = usePurchases();
  const [portalDataVisible, setPortalDataVisible] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const data = useMemo(() => {
    const eligible = purchases.filter(
      (p) => p.itcEligible && p.status === "confirmed",
    );
    const blocked = purchases.filter(
      (p) => !p.itcEligible && p.status === "confirmed",
    );

    return {
      eligible,
      blocked,
      totalEligibleCgst: eligible.reduce((s, p) => s + p.totalCgst, 0),
      totalEligibleSgst: eligible.reduce((s, p) => s + p.totalSgst, 0),
      totalEligibleIgst: eligible.reduce((s, p) => s + p.totalIgst, 0),
      totalBlocked: blocked.reduce(
        (s, p) => s + p.totalCgst + p.totalSgst + p.totalIgst,
        0,
      ),
    };
  }, [purchases]);

  const portalSummary = useMemo(() => {
    const totalPortalITC = SYNTHETIC_PORTAL_DATA.reduce(
      (s, e) => s + e.igst + e.cgst + e.sgst,
      0,
    );
    const matchedITC = SYNTHETIC_PORTAL_DATA.filter(
      (e) => e.matchStatus === "Matched",
    ).reduce((s, e) => s + e.igst + e.cgst + e.sgst, 0);
    const unmatchedITC = totalPortalITC - matchedITC;
    return { totalPortalITC, matchedITC, unmatchedITC };
  }, []);

  const handleFetchGSTR2B = () => {
    setIsFetching(true);
    setTimeout(() => {
      setIsFetching(false);
      setPortalDataVisible(true);
      toast.success("GSTR-2B data fetched successfully (simulated)");
    }, 1500);
  };

  const summaryCards = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="bg-card border-border/70">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">ITC CGST</p>
          <p className="text-xl font-cabinet font-bold text-primary font-numeric">
            {formatINR(data.totalEligibleCgst)}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-card border-border/70">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">ITC SGST</p>
          <p className="text-xl font-cabinet font-bold text-primary font-numeric">
            {formatINR(data.totalEligibleSgst)}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-card border-border/70">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">ITC IGST</p>
          <p className="text-xl font-cabinet font-bold text-chart-2 font-numeric">
            {formatINR(data.totalEligibleIgst)}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-card border-border/70">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Blocked ITC</p>
          <p className="text-xl font-cabinet font-bold text-destructive font-numeric">
            {formatINR(data.totalBlocked)}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4" data-ocid="itc.section">
      <Tabs defaultValue="summary" data-ocid="itc.tab">
        <TabsList>
          <TabsTrigger value="summary" data-ocid="itc.summary.tab">
            ITC Summary
          </TabsTrigger>
          <TabsTrigger value="purchases" data-ocid="itc.purchases.tab">
            Eligible Purchases ({data.eligible.length})
          </TabsTrigger>
          <TabsTrigger value="gstr2b" data-ocid="itc.gstr2b.tab">
            GSTR-2B Match
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: ITC Summary */}
        <TabsContent value="summary" className="space-y-4">
          {summaryCards}
        </TabsContent>

        {/* Tab 2: Eligible Purchases */}
        <TabsContent value="purchases">
          <Card className="bg-card border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                ITC Eligible Purchases ({data.eligible.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.eligible.length === 0 ? (
                <div
                  className="p-8 text-center text-sm text-muted-foreground"
                  data-ocid="itc.empty_state"
                >
                  No ITC eligible purchases
                </div>
              ) : (
                <Table data-ocid="itc.list.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Bill #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>IGST</TableHead>
                      <TableHead>Total ITC</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.eligible.map((p, idx) => (
                      <TableRow key={p.id} data-ocid={`itc.item.${idx + 1}`}>
                        <TableCell className="pl-4 font-mono text-xs text-primary">
                          {p.billNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.vendorName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(p.billDate)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(p.totalCgst)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(p.totalSgst)}
                        </TableCell>
                        <TableCell className="font-numeric text-sm">
                          {formatINR(p.totalIgst)}
                        </TableCell>
                        <TableCell className="font-numeric font-bold">
                          {formatINR(p.totalCgst + p.totalSgst + p.totalIgst)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">
                            Eligible
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: GSTR-2B Match */}
        <TabsContent value="gstr2b" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Auto-match your purchase records with GSTN portal data
            </p>
            <Button
              variant="outline"
              onClick={handleFetchGSTR2B}
              disabled={isFetching}
              data-ocid="itc.gstr2b.fetch.button"
              className="gap-2"
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isFetching ? "Fetching..." : "Fetch GSTR-2B Data"}
            </Button>
          </div>

          {portalDataVisible && (
            <>
              {/* Portal Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-card border-border/70">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">
                      Total Portal ITC
                    </p>
                    <p className="text-xl font-cabinet font-bold text-primary font-numeric">
                      {formatINR(portalSummary.totalPortalITC)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/70">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Matched ITC</p>
                    <p className="text-xl font-cabinet font-bold text-green-600 dark:text-green-400 font-numeric">
                      {formatINR(portalSummary.matchedITC)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/70">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">
                      Unmatched ITC
                    </p>
                    <p className="text-xl font-cabinet font-bold text-destructive font-numeric">
                      {formatINR(portalSummary.unmatchedITC)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Portal Data Table */}
              <Card className="bg-card border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    GSTR-2B Portal Data (Simulated)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table data-ocid="itc.gstr2b.table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Vendor GSTIN</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Taxable</TableHead>
                        <TableHead className="text-right">IGST</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                        <TableHead className="text-right">SGST</TableHead>
                        <TableHead>Match Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SYNTHETIC_PORTAL_DATA.map((entry, idx) => (
                        <TableRow
                          key={entry.id}
                          data-ocid={`itc.gstr2b.item.${idx + 1}`}
                        >
                          <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                            {entry.vendorGstin}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-primary">
                            {entry.invoiceNo}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(entry.date)}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-sm">
                            {formatINR(entry.taxable)}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-sm">
                            {formatINR(entry.igst)}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-sm">
                            {formatINR(entry.cgst)}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-sm">
                            {formatINR(entry.sgst)}
                          </TableCell>
                          <TableCell>
                            {getMatchBadge(entry.matchStatus)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {!portalDataVisible && !isFetching && (
            <div
              className="text-center py-12 text-sm text-muted-foreground"
              data-ocid="itc.gstr2b.empty_state"
            >
              Click "Fetch GSTR-2B Data" to load portal records
            </div>
          )}

          {isFetching && (
            <div
              className="text-center py-12 text-sm text-muted-foreground"
              data-ocid="itc.gstr2b.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-primary" />
              Fetching GSTR-2B data from portal...
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
