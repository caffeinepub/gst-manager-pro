import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAttendanceRecords,
  useEmployees,
  useLeaveBalances,
} from "@/hooks/useGSTStore";
import type { AttendanceStatus, LeaveType } from "@/types/gst";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  P: "bg-green-500 text-white",
  A: "bg-red-500 text-white",
  H: "bg-yellow-400 text-gray-900",
};

const STATUS_CYCLE: AttendanceStatus[] = ["P", "A", "H"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function Attendance() {
  const { employees } = useEmployees();
  const { records, addRecord, updateRecord } = useAttendanceRecords();
  const { balances, addBalance, updateBalance } = useLeaveBalances();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");

  // Leave request state
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveEmpId, setLeaveEmpId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("CL");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");

  const monthKey = `${year}-${pad(month + 1)}`;
  const daysInMonth = getDaysInMonth(year, month);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const activeEmployees = employees.filter((e) => e.status === "active");

  const getRecord = (empId: string) =>
    records.find((r) => r.employeeId === empId && r.month === monthKey);

  const getStatus = (
    empId: string,
    day: number,
  ): AttendanceStatus | undefined => {
    const key = `${monthKey}-${pad(day)}`;
    return getRecord(empId)?.days[key];
  };

  const cycleStatus = (empId: string, day: number) => {
    const key = `${monthKey}-${pad(day)}`;
    const rec = getRecord(empId);
    const currentStatus = rec?.days[key];
    const nextIdx = currentStatus
      ? (STATUS_CYCLE.indexOf(currentStatus) + 1) % STATUS_CYCLE.length
      : 0;
    const nextStatus = STATUS_CYCLE[nextIdx];

    if (rec) {
      const newDays = { ...rec.days, [key]: nextStatus };
      const present = Object.values(newDays).filter((s) => s === "P").length;
      const absent = Object.values(newDays).filter((s) => s === "A").length;
      const half = Object.values(newDays).filter((s) => s === "H").length;
      const lop = Math.max(0, absent - 3); // 3 days grace
      updateRecord(rec.id, {
        days: newDays,
        presentDays: present,
        absentDays: absent,
        halfDays: half,
        lopDays: lop,
      });
    } else {
      const newDays: Record<string, AttendanceStatus> = { [key]: nextStatus };
      addRecord({
        employeeId: empId,
        month: monthKey,
        days: newDays,
        presentDays: nextStatus === "P" ? 1 : 0,
        absentDays: nextStatus === "A" ? 1 : 0,
        halfDays: nextStatus === "H" ? 1 : 0,
        lopDays: 0,
      });
    }
  };

  const getSummary = (empId: string) => {
    const rec = getRecord(empId);
    if (!rec) return { present: 0, absent: 0, half: 0, lop: 0 };
    return {
      present: rec.presentDays,
      absent: rec.absentDays,
      half: rec.halfDays,
      lop: rec.lopDays,
    };
  };

  const getLeaveBalance = (empId: string) =>
    balances.find((b) => b.employeeId === empId && b.year === year);

  const handleApplyLeave = () => {
    if (!leaveEmpId || !leaveFrom || !leaveTo) {
      toast.error("Please fill all leave fields");
      return;
    }
    const from = new Date(leaveFrom);
    const to = new Date(leaveTo);
    const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;

    let bal = getLeaveBalance(leaveEmpId);
    if (!bal) {
      const id = addBalance({
        employeeId: leaveEmpId,
        year,
        CL: 12,
        SL: 12,
        EL: 15,
        CLUsed: 0,
        SLUsed: 0,
        ELUsed: 0,
      });
      bal = balances.find((b) => b.id === id);
    }

    if (bal) {
      const usedKey = `${leaveType}Used` as "CLUsed" | "SLUsed" | "ELUsed";
      const avail = bal[leaveType] - (bal[usedKey] as number);
      if (days > avail) {
        toast.error(`Only ${avail} ${leaveType} days available`);
        return;
      }
      updateBalance(bal.id, {
        [usedKey]: (bal[usedKey] as number) + days,
      });
      toast.success(`${days} day(s) of ${leaveType} applied`);
    }
    setLeaveOpen(false);
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };

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

  const displayedEmployees = selectedEmpId
    ? activeEmployees.filter((e) => e.id === selectedEmpId)
    : activeEmployees;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Attendance</h1>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium min-w-[130px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
            <SelectTrigger
              className="w-48"
              data-ocid="payroll.attendance.select"
            >
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Employees</SelectItem>
              {activeEmployees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => setLeaveOpen(true)}
            data-ocid="payroll.attendance.open_modal_button"
          >
            Apply Leave
          </Button>
        </div>
      </div>

      {activeEmployees.length === 0 && (
        <div
          className="text-center text-muted-foreground py-12"
          data-ocid="payroll.attendance.empty_state"
        >
          No active employees found. Add employees first.
        </div>
      )}

      {displayedEmployees.map((emp) => {
        const summary = getSummary(emp.id);
        const leaveBalance = getLeaveBalance(emp.id);
        return (
          <Card key={emp.id} className="overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/40">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold">
                  {emp.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({emp.empCode})
                  </span>
                </CardTitle>
                <div className="flex gap-3 text-xs">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    P: {summary.present}
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    A: {summary.absent}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 text-yellow-700"
                  >
                    H: {summary.half}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700"
                  >
                    LOP: {summary.lop}
                  </Badge>
                  {leaveBalance && (
                    <span className="text-muted-foreground">
                      CL:{leaveBalance.CL - leaveBalance.CLUsed} SL:
                      {leaveBalance.SL - leaveBalance.SLUsed} EL:
                      {leaveBalance.EL - leaveBalance.ELUsed}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-1">
                {dayNumbers.map((day) => {
                  const status = getStatus(emp.id, day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => cycleStatus(emp.id, day)}
                      className={`w-9 h-9 rounded text-xs font-medium transition-colors touch-manipulation ${
                        status
                          ? STATUS_COLORS[status]
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                      title={`Day ${day}: ${status ?? "Not marked"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click day to cycle: Unmarked → Present → Absent → Half-day
              </p>
            </CardContent>
          </Card>
        );
      })}

      {/* Leave Request Dialog */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent data-ocid="payroll.attendance.dialog">
          <DialogHeader>
            <DialogTitle>Apply Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Employee</Label>
              <Select value={leaveEmpId} onValueChange={setLeaveEmpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Leave Type</Label>
              <Select
                value={leaveType}
                onValueChange={(v) => setLeaveType(v as LeaveType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CL">Casual Leave (CL)</SelectItem>
                  <SelectItem value="SL">Sick Leave (SL)</SelectItem>
                  <SelectItem value="EL">Earned Leave (EL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>From Date</Label>
                <input
                  type="date"
                  value={leaveFrom}
                  onChange={(e) => setLeaveFrom(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <Label>To Date</Label>
                <input
                  type="date"
                  value={leaveTo}
                  onChange={(e) => setLeaveTo(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeaveOpen(false)}
              data-ocid="payroll.attendance.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyLeave}
              data-ocid="payroll.attendance.confirm_button"
            >
              Apply Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
