import type {
  AuditLog,
  BankAccount,
  BankTransaction,
  Invoice,
  JournalEntry,
  Payment,
  Purchase,
} from "@/types/gst";
import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

export function useInvoices() {
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>(
    "gst_invoices",
    [],
  );

  const addInvoice = useCallback(
    (inv: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => {
      const newInv: Invoice = {
        ...inv,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setInvoices((prev) => [newInv, ...prev]);
      return newInv.id;
    },
    [setInvoices],
  );

  const updateInvoice = useCallback(
    (id: string, updates: Partial<Invoice>) => {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id ? { ...inv, ...updates, updatedAt: now() } : inv,
        ),
      );
    },
    [setInvoices],
  );

  const deleteInvoice = useCallback(
    (id: string) => {
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    },
    [setInvoices],
  );

  return { invoices, addInvoice, updateInvoice, deleteInvoice };
}

export function usePayments() {
  const [payments, setPayments] = useLocalStorage<Payment[]>(
    "gst_payments",
    [],
  );

  const addPayment = useCallback(
    (p: Omit<Payment, "id" | "createdAt">) => {
      const newP: Payment = { ...p, id: generateId(), createdAt: now() };
      setPayments((prev) => [newP, ...prev]);
      return newP.id;
    },
    [setPayments],
  );

  const deletePayment = useCallback(
    (id: string) => {
      setPayments((prev) => prev.filter((p) => p.id !== id));
    },
    [setPayments],
  );

  return { payments, addPayment, deletePayment };
}

export function usePurchases() {
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>(
    "gst_purchases",
    [],
  );

  const addPurchase = useCallback(
    (p: Omit<Purchase, "id" | "createdAt" | "updatedAt">) => {
      const newP: Purchase = {
        ...p,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setPurchases((prev) => [newP, ...prev]);
      return newP.id;
    },
    [setPurchases],
  );

  const updatePurchase = useCallback(
    (id: string, updates: Partial<Purchase>) => {
      setPurchases((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: now() } : p,
        ),
      );
    },
    [setPurchases],
  );

  const deletePurchase = useCallback(
    (id: string) => {
      setPurchases((prev) => prev.filter((p) => p.id !== id));
    },
    [setPurchases],
  );

  return { purchases, addPurchase, updatePurchase, deletePurchase };
}

export function useJournalEntries() {
  const [entries, setEntries] = useLocalStorage<JournalEntry[]>(
    "gst_journal",
    [],
  );

  const addEntry = useCallback(
    (e: Omit<JournalEntry, "id" | "createdAt">) => {
      const newE: JournalEntry = { ...e, id: generateId(), createdAt: now() };
      setEntries((prev) => [newE, ...prev]);
      return newE.id;
    },
    [setEntries],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [setEntries],
  );

  return { entries, addEntry, deleteEntry };
}

export function useBankAccounts() {
  const [accounts, setAccounts] = useLocalStorage<BankAccount[]>(
    "gst_bank_accounts",
    [],
  );

  const addAccount = useCallback(
    (a: Omit<BankAccount, "id" | "createdAt">) => {
      const newA: BankAccount = { ...a, id: generateId(), createdAt: now() };
      setAccounts((prev) => [newA, ...prev]);
      return newA.id;
    },
    [setAccounts],
  );

  const updateAccount = useCallback(
    (id: string, updates: Partial<BankAccount>) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      );
    },
    [setAccounts],
  );

  const deleteAccount = useCallback(
    (id: string) => {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    },
    [setAccounts],
  );

  return { accounts, addAccount, updateAccount, deleteAccount };
}

export function useBankTransactions() {
  const [transactions, setTransactions] = useLocalStorage<BankTransaction[]>(
    "gst_bank_transactions",
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
      return newT.id;
    },
    [setTransactions],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [setTransactions],
  );

  return { transactions, addTransaction, deleteTransaction };
}

export function useAuditLogs() {
  const [logs, setLogs] = useLocalStorage<AuditLog[]>("gst_audit_logs", []);

  const addLog = useCallback(
    (log: Omit<AuditLog, "id" | "timestamp">) => {
      const newLog: AuditLog = { ...log, id: generateId(), timestamp: now() };
      setLogs((prev) => [newLog, ...prev].slice(0, 500)); // Keep last 500 logs
    },
    [setLogs],
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
  const [customAccounts, setCustomAccounts] = useLocalStorage<CustomAccount[]>(
    "gst_custom_accounts",
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
    },
    [setCustomAccounts],
  );

  const deleteAccount = useCallback(
    (id: string) => {
      setCustomAccounts((prev) => prev.filter((a) => a.id !== id));
    },
    [setCustomAccounts],
  );

  const updateAccount = useCallback(
    (
      id: string,
      updates: Partial<Omit<CustomAccount, "id" | "isCustom" | "createdAt">>,
    ) => {
      setCustomAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      );
    },
    [setCustomAccounts],
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
  const [movements, setMovements] = useLocalStorage<StockMovement[]>(
    "gst_stock_movements",
    [],
  );

  const addMovement = useCallback(
    (m: Omit<StockMovement, "id" | "createdAt">) => {
      const newM: StockMovement = { ...m, id: generateId(), createdAt: now() };
      setMovements((prev) => [newM, ...prev]);
    },
    [setMovements],
  );

  const deleteMovement = useCallback(
    (id: string) => {
      setMovements((prev) => prev.filter((m) => m.id !== id));
    },
    [setMovements],
  );

  return { movements, addMovement, deleteMovement };
}

export function useInvoiceCounter() {
  const [counters, setCounters] = useLocalStorage<Record<string, number>>(
    "gst_invoice_counters",
    {},
  );

  const getNextNumber = useCallback(
    (type: string, prefix: string) => {
      const current = counters[type] || 0;
      const next = current + 1;
      setCounters((prev) => ({ ...prev, [type]: next }));
      return `${prefix}${String(next).padStart(4, "0")}`;
    },
    [counters, setCounters],
  );

  return { getNextNumber };
}
