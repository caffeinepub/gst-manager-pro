import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GSTItem } from "@/hooks/useGSTStore";
import { useInvoices, usePurchases } from "@/hooks/useGSTStore";
import { useItems } from "@/hooks/useGSTStore";
import { formatINR } from "@/utils/formatting";
import { Download, Loader2, Package, Search } from "lucide-react";
import { useMemo, useState } from "react";

interface StockRow {
  id: string;
  name: string;
  hsnSacCode: string;
  openingStock: number;
  unitsPurchased: number;
  unitsSold: number;
  closingStock: number;
  stockValue: number;
  sellingPrice: number;
  unit: number;
}

function computeStockRows(
  items: GSTItem[],
  invoices: ReturnType<typeof useInvoices>["invoices"],
  purchases: ReturnType<typeof usePurchases>["purchases"],
): StockRow[] {
  return items.map((item) => {
    const itemIdStr = item.id;
    const openingStock = item.openingStock;
    const sellingPrice = item.sellingPrice;

    const unitsSold = invoices
      .filter(
        (inv) =>
          ["sales", "service"].includes(inv.type) && inv.status === "confirmed",
      )
      .reduce((sum, inv) => {
        const lineQty = inv.lineItems
          .filter((line) => line.itemId === itemIdStr)
          .reduce((s, line) => s + line.qty, 0);
        return sum + lineQty;
      }, 0);

    const unitsPurchased = purchases
      .filter((p) => p.status === "confirmed")
      .reduce((sum, p) => {
        const lineQty = p.lineItems
          .filter((line) => line.itemId === itemIdStr)
          .reduce((s, line) => s + line.qty, 0);
        return sum + lineQty;
      }, 0);

    const closingStock = openingStock + unitsPurchased - unitsSold;
    const stockValue = closingStock * sellingPrice;

    return {
      id: itemIdStr,
      name: item.name,
      hsnSacCode: item.hsnSacCode,
      openingStock,
      unitsPurchased,
      unitsSold,
      closingStock,
      stockValue,
      sellingPrice,
      unit: item.unit,
    };
  });
}

function stockBadgeVariant(
  closing: number,
): "default" | "secondary" | "destructive" {
  if (closing > 10) return "default";
  if (closing > 0) return "secondary";
  return "destructive";
}

export function StockSummary() {
  const { items = [], isLoading } = useItems();
  const { invoices } = useInvoices();
  const { purchases } = usePurchases();
  const [search, setSearch] = useState("");

  const stockRows = useMemo(
    () => computeStockRows(items, invoices, purchases),
    [items, invoices, purchases],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return stockRows;
    const q = search.toLowerCase();
    return stockRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.hsnSacCode.toLowerCase().includes(q),
    );
  }, [stockRows, search]);

  const totalStockValue = useMemo(
    () => filtered.reduce((sum, r) => sum + r.stockValue, 0),
    [filtered],
  );

  const exportCSV = () => {
    const headers = [
      "Item Name",
      "HSN/SAC",
      "Opening Stock",
      "Purchased",
      "Sold",
      "Closing Stock",
      "Selling Price",
      "Stock Value",
    ];
    const rows = filtered.map((r) => [
      r.name,
      r.hsnSacCode || "-",
      r.openingStock,
      r.unitsPurchased,
      r.unitsSold,
      r.closingStock,
      r.sellingPrice.toFixed(2),
      r.stockValue.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        data-ocid="stock.loading_state"
      >
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="stock.section">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-cabinet font-bold text-foreground">
          Stock Summary Report
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Total Items
            </p>
            <p className="text-2xl font-cabinet font-bold text-foreground">
              {filtered.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Total Stock Value
            </p>
            <p className="text-2xl font-cabinet font-bold text-primary font-numeric">
              {formatINR(totalStockValue)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Zero Stock Items
            </p>
            <p className="text-2xl font-cabinet font-bold text-destructive">
              {filtered.filter((r) => r.closingStock <= 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search items or HSN/SAC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
            data-ocid="stock.search_input"
          />
        </div>
        <Button
          variant="outline"
          onClick={exportCSV}
          className="gap-2"
          data-ocid="stock.export.button"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Inventory Stock ({filtered.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center" data-ocid="stock.empty_state">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {search ? "No items match your search" : "No items found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="stock.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Item Name</TableHead>
                    <TableHead>HSN/SAC</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Purchased</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right pr-4">
                      Stock Value
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, idx) => (
                    <TableRow key={row.id} data-ocid={`stock.item.${idx + 1}`}>
                      <TableCell className="pl-4 font-medium">
                        {row.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.hsnSacCode || "-"}
                      </TableCell>
                      <TableCell className="text-right font-numeric text-sm">
                        {row.openingStock}
                      </TableCell>
                      <TableCell className="text-right font-numeric text-sm text-chart-2">
                        +{row.unitsPurchased}
                      </TableCell>
                      <TableCell className="text-right font-numeric text-sm text-chart-4">
                        -{row.unitsSold}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={stockBadgeVariant(row.closingStock)}
                          className="font-numeric text-xs"
                        >
                          {row.closingStock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-numeric text-sm">
                        {formatINR(row.sellingPrice)}
                      </TableCell>
                      <TableCell className="text-right pr-4 font-numeric font-medium">
                        {formatINR(row.stockValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
