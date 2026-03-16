import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvoices } from "@/hooks/useGSTStore";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  getDaysUntil,
  getGSTR1DueDate,
  getGSTR3BDueDate,
} from "@/utils/formatting";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Settings,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  category: string;
}

const WORKFLOWS: Workflow[] = [
  {
    id: "gstr1-reminder",
    name: "GSTR-1 Filing Reminder",
    description:
      "Sends alert before GSTR-1 due date to ensure timely outward supply filing.",
    trigger: "5 days before 11th of each month",
    category: "Compliance",
  },
  {
    id: "gstr3b-reminder",
    name: "GSTR-3B Filing Reminder",
    description:
      "Alerts team to prepare and file GSTR-3B summary return on time.",
    trigger: "5 days before 20th of each month",
    category: "Compliance",
  },
  {
    id: "overdue-alerts",
    name: "Overdue Invoice Alerts",
    description:
      "Daily scan for confirmed invoices past their due date. Sends payment reminders.",
    trigger: "Daily at 9:00 AM",
    category: "Collections",
  },
  {
    id: "low-stock",
    name: "Low Stock Notifications",
    description:
      "Monitors inventory levels and alerts when any item's closing stock falls to 5 or below.",
    trigger: "When closing stock ≤ 5 units",
    category: "Inventory",
  },
  {
    id: "rcm-reminder",
    name: "RCM Payment Reminders",
    description:
      "Identifies unpaid RCM liabilities and reminds finance team to settle before month end.",
    trigger: "25th of each month",
    category: "Tax",
  },
  {
    id: "itc-reconciliation",
    name: "ITC Reconciliation Reminder",
    description:
      "Prompts reconciliation of GSTR-2B data with purchase register for ITC claims.",
    trigger: "14th of each month (GSTR-2B publish date)",
    category: "Compliance",
  },
  {
    id: "bank-reconciliation",
    name: "Bank Reconciliation Reminder",
    description:
      "End-of-month prompt to reconcile bank statement with book of accounts.",
    trigger: "Last working day of each month",
    category: "Accounting",
  },
  {
    id: "gstr9-reminder",
    name: "GSTR-9 Annual Return Reminder",
    description:
      "Annual return alert to prepare and file GSTR-9 before the December 31 deadline.",
    trigger: "1st November each year",
    category: "Compliance",
  },
];

interface WorkflowState {
  enabled: boolean;
  lastRun: string | null;
}

type WorkflowStates = Record<string, WorkflowState>;

const defaultStates: WorkflowStates = Object.fromEntries(
  WORKFLOWS.map((w) => [w.id, { enabled: true, lastRun: null }]),
);

function formatLastRun(iso: string | undefined): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays <= 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const categoryColors: Record<string, string> = {
  Compliance: "bg-primary/10 text-primary border-primary/20",
  Collections: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  Inventory: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  Tax: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  Accounting: "bg-muted text-muted-foreground border-border",
};

export function WorkflowAutomation() {
  const { invoices } = useInvoices();
  const [workflowStates, setWorkflowStates] = useLocalStorage<WorkflowStates>(
    "gst_workflow_states",
    defaultStates,
  );
  const [runningId, setRunningId] = useState<string | null>(null);

  // Real-data computed alerts
  const alerts = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const gstr1Due = getGSTR1DueDate();
    const gstr3bDue = getGSTR3BDueDate();
    const daysToGSTR1 = getDaysUntil(gstr1Due);
    const daysToGSTR3B = getDaysUntil(gstr3bDue);

    const overdueInvoices = invoices.filter(
      (inv) =>
        ["sales", "service"].includes(inv.type) &&
        inv.status === "confirmed" &&
        inv.dueDate < today,
    );

    const eWayExpiring = invoices.filter(
      (inv) =>
        inv.type === "eway_bill" &&
        inv.status === "confirmed" &&
        inv.dueDate <= today,
    );

    return {
      gstr1: {
        daysLeft: daysToGSTR1,
        dueDate: gstr1Due,
        urgent: daysToGSTR1 <= 7,
      },
      gstr3b: {
        daysLeft: daysToGSTR3B,
        dueDate: gstr3bDue,
        urgent: daysToGSTR3B <= 7,
      },
      overdue: {
        count: overdueInvoices.length,
        urgent: overdueInvoices.length > 0,
      },
      eWay: { count: eWayExpiring.length, urgent: eWayExpiring.length > 0 },
    };
  }, [invoices]);

  const toggleWorkflow = (id: string) => {
    setWorkflowStates((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { enabled: true, lastRun: null }),
        enabled: !(prev[id]?.enabled ?? true),
      },
    }));
  };

  const runNow = (workflow: Workflow) => {
    setRunningId(workflow.id);
    setTimeout(() => {
      const isoNow = new Date().toISOString();
      setWorkflowStates((prev) => ({
        ...prev,
        [workflow.id]: {
          ...(prev[workflow.id] ?? { enabled: true, lastRun: null }),
          lastRun: isoNow,
        },
      }));
      setRunningId(null);
      toast.success(`Workflow "${workflow.name}" executed successfully`, {
        description: `Completed at ${new Date(isoNow).toLocaleString("en-IN")}`,
      });
    }, 1500);
  };

  const activeCount = WORKFLOWS.filter(
    (w) => workflowStates[w.id]?.enabled ?? true,
  ).length;

  const lastRunAnyIso = WORKFLOWS.map((w) => workflowStates[w.id]?.lastRun)
    .filter(Boolean)
    .sort()
    .pop();
  const lastRunAny = lastRunAnyIso ? formatLastRun(lastRunAnyIso) : null;

  return (
    <div className="space-y-6" data-ocid="workflow.section">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-cabinet font-bold text-foreground">
            Workflow Automation
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure automated reminders and background jobs
          </p>
        </div>
      </div>

      {/* Real-Time Alerts */}
      {(alerts.gstr1.urgent ||
        alerts.gstr3b.urgent ||
        alerts.overdue.urgent ||
        alerts.eWay.urgent) && (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.gstr1.urgent && (
              <div
                className="flex items-center gap-2 text-sm"
                data-ocid="workflow.gstr1.alert"
              >
                <Badge variant="destructive" className="text-xs shrink-0">
                  {alerts.gstr1.daysLeft <= 0
                    ? "Overdue"
                    : `${alerts.gstr1.daysLeft}d left`}
                </Badge>
                <span>
                  GSTR-1 filing due <strong>{alerts.gstr1.dueDate}</strong>
                </span>
              </div>
            )}
            {alerts.gstr3b.urgent && (
              <div
                className="flex items-center gap-2 text-sm"
                data-ocid="workflow.gstr3b.alert"
              >
                <Badge variant="destructive" className="text-xs shrink-0">
                  {alerts.gstr3b.daysLeft <= 0
                    ? "Overdue"
                    : `${alerts.gstr3b.daysLeft}d left`}
                </Badge>
                <span>
                  GSTR-3B filing due <strong>{alerts.gstr3b.dueDate}</strong>
                </span>
              </div>
            )}
            {alerts.overdue.urgent && (
              <div
                className="flex items-center gap-2 text-sm"
                data-ocid="workflow.overdue.alert"
              >
                <Badge variant="destructive" className="text-xs shrink-0">
                  {alerts.overdue.count} overdue
                </Badge>
                <span>
                  Confirmed invoices past due date — follow up on payments
                </span>
              </div>
            )}
            {alerts.eWay.urgent && (
              <div
                className="flex items-center gap-2 text-sm"
                data-ocid="workflow.eway.alert"
              >
                <Badge variant="destructive" className="text-xs shrink-0">
                  {alerts.eWay.count} expiring
                </Badge>
                <span>e-Way bills have reached their due date</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-cabinet font-bold text-foreground leading-none">
                {activeCount}
                <span className="text-sm text-muted-foreground font-normal">
                  /{WORKFLOWS.length}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active Workflows
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/70">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-cabinet font-bold text-foreground leading-snug">
                {lastRunAny || "Never"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last Executed
              </p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-border/70 ${alerts.gstr1.urgent || alerts.gstr3b.urgent ? "bg-destructive/5 border-destructive/20" : "bg-card"}`}
        >
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${alerts.gstr1.urgent ? "bg-destructive/10" : "bg-chart-3/10"}`}
            >
              <Bell
                className={`w-5 h-5 ${alerts.gstr1.urgent ? "text-destructive" : "text-chart-3"}`}
              />
            </div>
            <div>
              <p className="text-sm font-cabinet font-bold text-foreground leading-snug">
                {alerts.gstr1.daysLeft <= 0
                  ? "GSTR-1 Overdue!"
                  : alerts.gstr1.daysLeft <= 7
                    ? `GSTR-1: ${alerts.gstr1.daysLeft}d left`
                    : `GSTR-1: ${alerts.gstr1.dueDate}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Next Filing Deadline
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows Table */}
      <Card className="bg-card border-border/70">
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm">
            Automated Workflows ({WORKFLOWS.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table data-ocid="workflow.list.table">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Workflow</TableHead>
                <TableHead className="hidden md:table-cell">Trigger</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Last Run</TableHead>
                <TableHead className="text-center">Enabled</TableHead>
                <TableHead className="text-right pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {WORKFLOWS.map((workflow, idx) => {
                const state = workflowStates[workflow.id] ?? {
                  enabled: true,
                  lastRun: null,
                };
                const isRunning = runningId === workflow.id;
                return (
                  <TableRow
                    key={workflow.id}
                    data-ocid={`workflow.item.${idx + 1}`}
                    className={!state.enabled ? "opacity-50" : ""}
                  >
                    <TableCell className="pl-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {workflow.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                          {workflow.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 md:hidden">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {workflow.trigger}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {workflow.trigger}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={`text-xs ${categoryColors[workflow.category] ?? ""}`}
                      >
                        {workflow.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatLastRun(state.lastRun ?? undefined)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={state.enabled}
                        onCheckedChange={() => toggleWorkflow(workflow.id)}
                        data-ocid={`workflow.toggle.${idx + 1}`}
                      />
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        disabled={!state.enabled || isRunning}
                        onClick={() => runNow(workflow)}
                        data-ocid={`workflow.run.button.${idx + 1}`}
                      >
                        {isRunning ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        {isRunning ? "Running..." : "Run Now"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="bg-chart-2/5 border-chart-2/20">
        <CardContent className="pt-4 pb-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-chart-2 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-chart-2 font-medium">Note: </span>
            Workflow automation runs are simulated in this environment. In
            production, these would connect to your Email/SMS gateway for actual
            notifications. All workflow states are persisted locally. Alerts
            above are computed from your real invoice and filing data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
