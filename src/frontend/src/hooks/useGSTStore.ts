import type {
  AttendanceRecord,
  AuditLog,
  BankAccount,
  BankTransaction,
  Employee,
  Invoice,
  JournalEntry,
  LeaveBalance,
  Payment,
  PayrollRun,
  Purchase,
} from "@/types/gst";
import { useCallback } from "react";
import { useBusinessContext } from "./useBusinessContext";
import { useLocalStorage } from "./useLocalStorage";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

/** Dispatch a cloud-sync event so useCloudSync picks up mutations. */
function notifyChange(key: string) {
  window.dispatchEvent(
    new CustomEvent("gst-data-changed", { detail: { key } }),
  );
}

/** Returns the namespaced localStorage key for the active business, falling back to flat key. */
function bizKey(activeBizId: string | null, suffix: string): string {
  return activeBizId ? `gst_${activeBizId}_${suffix}` : `gst_${suffix}`;
}

export function useInvoices() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "invoices");
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>(key, []);

  const addInvoice = useCallback(
    (inv: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => {
      const newInv: Invoice = {
        ...inv,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setInvoices((prev) => [newInv, ...prev]);
      notifyChange(key);
      return newInv.id;
    },
    [setInvoices, key],
  );

  const updateInvoice = useCallback(
    (id: string, updates: Partial<Invoice>) => {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id ? { ...inv, ...updates, updatedAt: now() } : inv,
        ),
      );
      notifyChange(key);
    },
    [setInvoices, key],
  );

  const deleteInvoice = useCallback(
    (id: string) => {
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      notifyChange(key);
    },
    [setInvoices, key],
  );

  return { invoices, addInvoice, updateInvoice, deleteInvoice };
}

export function usePayments() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "payments");
  const [payments, setPayments] = useLocalStorage<Payment[]>(key, []);

  const addPayment = useCallback(
    (p: Omit<Payment, "id" | "createdAt">) => {
      const newP: Payment = { ...p, id: generateId(), createdAt: now() };
      setPayments((prev) => [newP, ...prev]);
      notifyChange(key);
      return newP.id;
    },
    [setPayments, key],
  );

  const updatePayment = useCallback(
    (id: string, updates: Partial<Payment>) => {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: now() } : p,
        ),
      );
      notifyChange(key);
    },
    [setPayments, key],
  );

  const deletePayment = useCallback(
    (id: string) => {
      setPayments((prev) => prev.filter((p) => p.id !== id));
      notifyChange(key);
    },
    [setPayments, key],
  );

  return { payments, addPayment, updatePayment, deletePayment };
}

export function usePurchases() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "purchases");
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>(key, []);

  const addPurchase = useCallback(
    (p: Omit<Purchase, "id" | "createdAt" | "updatedAt">) => {
      const newP: Purchase = {
        ...p,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setPurchases((prev) => [newP, ...prev]);
      notifyChange(key);
      return newP.id;
    },
    [setPurchases, key],
  );

  const updatePurchase = useCallback(
    (id: string, updates: Partial<Purchase>) => {
      setPurchases((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: now() } : p,
        ),
      );
      notifyChange(key);
    },
    [setPurchases, key],
  );

  const deletePurchase = useCallback(
    (id: string) => {
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      notifyChange(key);
    },
    [setPurchases, key],
  );

  return { purchases, addPurchase, updatePurchase, deletePurchase };
}

export function useJournalEntries() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "journal");
  const [entries, setEntries] = useLocalStorage<JournalEntry[]>(key, []);

  const addEntry = useCallback(
    (e: Omit<JournalEntry, "id" | "createdAt">) => {
      const newE: JournalEntry = { ...e, id: generateId(), createdAt: now() };
      setEntries((prev) => [newE, ...prev]);
      notifyChange(key);
      return newE.id;
    },
    [setEntries, key],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      notifyChange(key);
    },
    [setEntries, key],
  );

  const updateEntry = useCallback(
    (id: string, updates: Partial<JournalEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      );
      notifyChange(key);
    },
    [setEntries, key],
  );

  return { entries, addEntry, updateEntry, deleteEntry };
}

export function useBankAccounts() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "bank_accounts");
  const [accounts, setAccounts] = useLocalStorage<BankAccount[]>(key, []);

  const addAccount = useCallback(
    (a: Omit<BankAccount, "id" | "createdAt">) => {
      const newA: BankAccount = { ...a, id: generateId(), createdAt: now() };
      setAccounts((prev) => [newA, ...prev]);
      notifyChange(key);
      return newA.id;
    },
    [setAccounts, key],
  );

  const updateAccount = useCallback(
    (id: string, updates: Partial<BankAccount>) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      );
      notifyChange(key);
    },
    [setAccounts, key],
  );

  const deleteAccount = useCallback(
    (id: string) => {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      notifyChange(key);
    },
    [setAccounts, key],
  );

  return { accounts, addAccount, updateAccount, deleteAccount };
}

export function useBankTransactions() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "bank_transactions");
  const [transactions, setTransactions] = useLocalStorage<BankTransaction[]>(
    key,
    [],
  );

  const addTransaction = useCallback(
    (t: Omit<BankTransaction, "id" | "createdAt">) => {
      const newT: BankTransaction = {
        ...t,
        id: generateId(),
        createdAt: now(),
      };
      setTransactions((prev) => [newT, ...prev]);
      notifyChange(key);
      return newT.id;
    },
    [setTransactions, key],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      notifyChange(key);
    },
    [setTransactions, key],
  );

  const updateTransaction = useCallback(
    (id: string, updates: Partial<BankTransaction>) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );
      notifyChange(key);
    },
    [setTransactions, key],
  );

  return { transactions, addTransaction, updateTransaction, deleteTransaction };
}

export function useAuditLogs() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "audit_logs");
  const [logs, setLogs] = useLocalStorage<AuditLog[]>(key, []);

  const addLog = useCallback(
    (log: Omit<AuditLog, "id" | "timestamp">) => {
      const newLog: AuditLog = { ...log, id: generateId(), timestamp: now() };
      setLogs((prev) => [newLog, ...prev].slice(0, 500)); // Keep last 500 logs
      notifyChange(key);
    },
    [setLogs, key],
  );

  return { logs, addLog };
}

export interface CustomAccount {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  isCustom: true;
  createdAt: string;
}

export function useCustomAccounts() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "custom_accounts");
  const [customAccounts, setCustomAccounts] = useLocalStorage<CustomAccount[]>(
    key,
    [],
  );

  const addAccount = useCallback(
    (a: Omit<CustomAccount, "id" | "createdAt" | "isCustom">) => {
      const newA: CustomAccount = {
        ...a,
        isCustom: true,
        id: generateId(),
        createdAt: now(),
      };
      setCustomAccounts((prev) => [...prev, newA]);
      notifyChange(key);
    },
    [setCustomAccounts, key],
  );

  const deleteAccount = useCallback(
    (id: string) => {
      setCustomAccounts((prev) => prev.filter((a) => a.id !== id));
      notifyChange(key);
    },
    [setCustomAccounts, key],
  );

  const updateAccount = useCallback(
    (
      id: string,
      updates: Partial<Omit<CustomAccount, "id" | "isCustom" | "createdAt">>,
    ) => {
      setCustomAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      );
      notifyChange(key);
    },
    [setCustomAccounts, key],
  );

  return { customAccounts, addAccount, updateAccount, deleteAccount };
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: "receipt" | "issue";
  qty: number;
  date: string;
  reference: string;
  narration: string;
  createdAt: string;
}

export function useStockMovements() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "stock_movements");
  const [movements, setMovements] = useLocalStorage<StockMovement[]>(key, []);

  const addMovement = useCallback(
    (m: Omit<StockMovement, "id" | "createdAt">) => {
      const newM: StockMovement = { ...m, id: generateId(), createdAt: now() };
      setMovements((prev) => [newM, ...prev]);
      notifyChange(key);
    },
    [setMovements, key],
  );

  const deleteMovement = useCallback(
    (id: string) => {
      setMovements((prev) => prev.filter((m) => m.id !== id));
      notifyChange(key);
    },
    [setMovements, key],
  );

  return { movements, addMovement, deleteMovement };
}

const DEFAULT_DECLARATION =
  "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. This is a GST compliant tax invoice.";

const DEFAULT_TERMS = `1. Payment is due within 10 days from the date of invoice.\n2. Please make all cheques payable to "BUSINESS NAME".\n3. Interest @18% p.a. will be charged on delayed payments beyond due date.\n4. Goods once sold will not be taken back or exchanged.\n5. Subject to "STATE" jurisdiction only.\n6. This is a computer-generated invoice and does not require a physical signature.`;

export interface InvoiceDefaults {
  declaration: string;
  termsConditions: string;
}

export function useInvoiceDefaults() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "invoice_defaults");
  const [defaults, setDefaults] = useLocalStorage<InvoiceDefaults>(key, {
    declaration: DEFAULT_DECLARATION,
    termsConditions: DEFAULT_TERMS,
  });

  const saveDefaults = useCallback(
    (updates: Partial<InvoiceDefaults>) => {
      setDefaults((prev) => ({ ...prev, ...updates }));
      notifyChange(key);
    },
    [setDefaults, key],
  );

  return { defaults, saveDefaults };
}

export function useInvoiceCounter() {
  const { activeBizId } = useBusinessContext();
  const counterKey = bizKey(activeBizId, "invoice_counters");
  const [, setCounters] = useLocalStorage<Record<string, number>>(
    counterKey,
    {},
  );

  // Read directly from localStorage to avoid stale closure double-increment
  const getNextNumber = useCallback(
    (type: string, prefix: string) => {
      const stored = localStorage.getItem(counterKey);
      const counters: Record<string, number> = stored ? JSON.parse(stored) : {};
      const current = counters[type] || 0;
      const next = current + 1;
      setCounters((prev) => ({ ...prev, [type]: next }));
      return `${prefix}${String(next).padStart(4, "0")}`;
    },
    [setCounters, counterKey],
  );

  return { getNextNumber };
}

// ─── Payroll Hooks ────────────────────────────────────────────────────────────

export function useEmployees() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "employees");
  const [employees, setEmployees] = useLocalStorage<Employee[]>(key, []);

  const addEmployee = useCallback(
    (emp: Omit<Employee, "id" | "createdAt" | "updatedAt">) => {
      const newEmp: Employee = {
        ...emp,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setEmployees((prev) => [newEmp, ...prev]);
      notifyChange(key);
      return newEmp.id;
    },
    [setEmployees, key],
  );

  const updateEmployee = useCallback(
    (id: string, updates: Partial<Employee>) => {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, ...updates, updatedAt: now() } : e,
        ),
      );
      notifyChange(key);
    },
    [setEmployees, key],
  );

  const deleteEmployee = useCallback(
    (id: string) => {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      notifyChange(key);
    },
    [setEmployees, key],
  );

  return { employees, addEmployee, updateEmployee, deleteEmployee };
}

export function useAttendanceRecords() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "attendance");
  const [records, setRecords] = useLocalStorage<AttendanceRecord[]>(key, []);

  const addRecord = useCallback(
    (r: Omit<AttendanceRecord, "id" | "createdAt" | "updatedAt">) => {
      const newR: AttendanceRecord = {
        ...r,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setRecords((prev) => [newR, ...prev]);
      notifyChange(key);
      return newR.id;
    },
    [setRecords, key],
  );

  const updateRecord = useCallback(
    (id: string, updates: Partial<AttendanceRecord>) => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, ...updates, updatedAt: now() } : r,
        ),
      );
      notifyChange(key);
    },
    [setRecords, key],
  );

  const deleteRecord = useCallback(
    (id: string) => {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      notifyChange(key);
    },
    [setRecords, key],
  );

  return { records, addRecord, updateRecord, deleteRecord };
}

export function useLeaveBalances() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "leave_balances");
  const [balances, setBalances] = useLocalStorage<LeaveBalance[]>(key, []);

  const addBalance = useCallback(
    (b: Omit<LeaveBalance, "id" | "createdAt" | "updatedAt">) => {
      const newB: LeaveBalance = {
        ...b,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setBalances((prev) => [...prev, newB]);
      notifyChange(key);
      return newB.id;
    },
    [setBalances, key],
  );

  const updateBalance = useCallback(
    (id: string, updates: Partial<LeaveBalance>) => {
      setBalances((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, ...updates, updatedAt: now() } : b,
        ),
      );
      notifyChange(key);
    },
    [setBalances, key],
  );

  return { balances, addBalance, updateBalance };
}

export function usePayrollRuns() {
  const { activeBizId } = useBusinessContext();
  const key = bizKey(activeBizId, "payroll_runs");
  const [runs, setRuns] = useLocalStorage<PayrollRun[]>(key, []);

  const addRun = useCallback(
    (r: Omit<PayrollRun, "id" | "createdAt" | "updatedAt">) => {
      const newR: PayrollRun = {
        ...r,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setRuns((prev) => [newR, ...prev]);
      notifyChange(key);
      return newR.id;
    },
    [setRuns, key],
  );

  const updateRun = useCallback(
    (id: string, updates: Partial<PayrollRun>) => {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, ...updates, updatedAt: now() } : r,
        ),
      );
      notifyChange(key);
    },
    [setRuns, key],
  );

  const deleteRun = useCallback(
    (id: string) => {
      setRuns((prev) => prev.filter((r) => r.id !== id));
      notifyChange(key);
    },
    [setRuns, key],
  );

  return { runs, addRun, updateRun, deleteRun };
}
