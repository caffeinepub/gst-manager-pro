/**
 * useBackendStore.ts
 *
 * Replaces localStorage-based useGSTStore with ICP backend storage.
 * All entity reads/writes go through the backend actor via React Query.
 * Provides the same API surface as useGSTStore so page components need no changes.
 */

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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

// ─── Business context (active biz stored in localStorage as UI state) ─────────

const ACTIVE_BIZ_KEY = "gst_active_business";

export interface Business {
  id: string;
  name: string;
  gstin: string;
  stateCode: string;
  logo?: string;
  role: "admin" | "user";
  businessType?: "Regular" | "Composition" | "Unregistered";
  createdAt: string;
  updatedAt: string;
  fontFamily?: string;
  customFontBase64?: string;
  customFontName?: string;
  themePreset?: string;
  primaryColor?: string;
  secondaryColor?: string;
  bgColor?: string;
  textColor?: string;
}

// ─── Business Backend Hook ─────────────────────────────────────────────────────

export function useBusinessBackend() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const userId = identity?.getPrincipal().toString() ?? "anonymous";

  const [activeBizId, setActiveBizId] = useState<string>(
    () => localStorage.getItem(ACTIVE_BIZ_KEY) ?? "",
  );

  // Sync activeBizId changes to localStorage
  useEffect(() => {
    if (activeBizId) {
      localStorage.setItem(ACTIVE_BIZ_KEY, activeBizId);
    } else {
      localStorage.removeItem(ACTIVE_BIZ_KEY);
    }
  }, [activeBizId]);

  const businessesQuery = useQuery<Business[]>({
    queryKey: ["businesses", userId],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const records = await actor.getAllBusinessRecords();
        return records.map((r) => JSON.parse(r) as Business);
      } catch (err) {
        console.error("[useBusinessBackend] Failed to load businesses:", err);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });

  const businesses = businessesQuery.data ?? [];
  const isLoading = businessesQuery.isLoading || isFetching;

  // Auto-select first business if activeBizId is not set
  useEffect(() => {
    if (!activeBizId && businesses.length > 0) {
      setActiveBizId(businesses[0].id);
    }
  }, [activeBizId, businesses]);

  const activeBusiness =
    businesses.find((b) => b.id === activeBizId) ?? businesses[0] ?? null;

  const addBusinessMutation = useMutation({
    mutationFn: async (
      biz: Omit<Business, "id" | "createdAt" | "updatedAt">,
    ) => {
      if (!actor) throw new Error("Not authenticated");
      const id = `biz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newBiz: Business = {
        ...biz,
        id,
        createdAt: now(),
        updatedAt: now(),
      };
      await actor.saveBusinessRecord(id, JSON.stringify(newBiz));
      return newBiz;
    },
    onSuccess: (newBiz) => {
      queryClient.invalidateQueries({ queryKey: ["businesses", userId] });
      // Auto-select the first business created
      if (businesses.length === 0) {
        setActiveBizId(newBiz.id);
        window.dispatchEvent(new CustomEvent("gst-business-switched"));
      }
    },
    onError: (err) => {
      toast.error(`Failed to save business: ${String(err)}`);
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: { id: string; updates: Partial<Business> }) => {
      if (!actor) throw new Error("Not authenticated");
      const current = businesses.find((b) => b.id === id);
      if (!current) throw new Error("Business not found");
      const updated = { ...current, ...updates, updatedAt: now() };
      await actor.saveBusinessRecord(id, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses", userId] });
    },
    onError: (err) => {
      toast.error(`Failed to update business: ${String(err)}`);
    },
  });

  const deleteBusinessMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.deleteBusinessRecord(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["businesses", userId] });
      if (activeBizId === deletedId) {
        const remaining = businesses.filter((b) => b.id !== deletedId);
        const nextId = remaining[0]?.id ?? "";
        setActiveBizId(nextId);
        window.dispatchEvent(new CustomEvent("gst-business-switched"));
      }
    },
    onError: (err) => {
      toast.error(`Failed to delete business: ${String(err)}`);
    },
  });

  const addBusiness = useCallback(
    (biz: Omit<Business, "id" | "createdAt" | "updatedAt">) => {
      return addBusinessMutation.mutateAsync(biz).then((b) => b.id);
    },
    [addBusinessMutation],
  );

  const updateBusiness = useCallback(
    (id: string, updates: Partial<Business>) => {
      return updateBusinessMutation.mutateAsync({ id, updates });
    },
    [updateBusinessMutation],
  );

  const deleteBusiness = useCallback(
    (id: string) => {
      return deleteBusinessMutation.mutateAsync(id);
    },
    [deleteBusinessMutation],
  );

  const switchBusiness = useCallback((id: string) => {
    setActiveBizId(id);
    localStorage.setItem(ACTIVE_BIZ_KEY, id);
    window.dispatchEvent(new CustomEvent("gst-business-switched"));
  }, []);

  return {
    businesses,
    activeBusiness,
    activeBizId: activeBizId || null,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    switchBusiness,
    isLoading,
    refetch: businessesQuery.refetch,
  };
}

// ─── Generic entity hook factory ──────────────────────────────────────────────
// Uses optimistic updates: mutations update React Query cache synchronously,
// then persist to backend asynchronously. Preserves sync return types for
// page components that use IDs immediately after calling add functions.

function useEntityList<T extends { id: string }>(entityType: string) {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  const bizId = localStorage.getItem(ACTIVE_BIZ_KEY) ?? "";

  const listQuery = useQuery<T[]>({
    queryKey: ["entities", bizId, entityType],
    queryFn: async () => {
      if (!actor || !bizId) return [];
      try {
        const records = await actor.getAllEntityRecords(bizId, entityType);
        return records.map((r) => JSON.parse(r) as T);
      } catch (err) {
        console.error(`[useEntityList:${entityType}] Failed to load:`, err);
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!bizId,
    staleTime: 10_000,
  });

  // Synchronous optimistic save + async backend persist
  const save = useCallback(
    (record: T): void => {
      const key = ["entities", bizId, entityType];
      queryClient.setQueryData<T[]>(key, (prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((r) => r.id === record.id);
        if (idx >= 0) {
          return [...list.slice(0, idx), record, ...list.slice(idx + 1)];
        }
        return [record, ...list];
      });
      if (actor && bizId) {
        actor
          .saveEntityRecord(
            bizId,
            entityType,
            record.id,
            JSON.stringify(record),
          )
          .catch((err) => {
            console.error(`[${entityType}] Save failed:`, err);
            queryClient.invalidateQueries({ queryKey: key });
          });
      }
    },
    [actor, bizId, entityType, queryClient],
  );

  // Synchronous optimistic remove + async backend persist
  const remove = useCallback(
    (id: string): void => {
      const key = ["entities", bizId, entityType];
      queryClient.setQueryData<T[]>(key, (prev) =>
        (prev ?? []).filter((r) => r.id !== id),
      );
      if (actor && bizId) {
        actor.deleteEntityRecord(bizId, entityType, id).catch((err) => {
          console.error(`[${entityType}] Delete failed:`, err);
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
    [actor, bizId, entityType, queryClient],
  );

  return {
    data: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    save,
    remove,
    refetch: listQuery.refetch,
  };
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useInvoices() {
  const { data: invoices, save, remove } = useEntityList<Invoice>("invoices");

  const addInvoice = useCallback(
    (inv: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => {
      const newInv: Invoice = {
        ...inv,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      save(newInv);
      return newInv.id;
    },
    [save],
  );

  const updateInvoice = useCallback(
    (id: string, updates: Partial<Invoice>) => {
      const existing = invoices.find((i) => i.id === id);
      if (!existing) return;
      save({ ...existing, ...updates, updatedAt: now() });
    },
    [invoices, save],
  );

  const deleteInvoice = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  return { invoices, addInvoice, updateInvoice, deleteInvoice };
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export function usePayments() {
  const { data: payments, save, remove } = useEntityList<Payment>("payments");

  const addPayment = useCallback(
    (p: Omit<Payment, "id" | "createdAt">) => {
      const newP: Payment = { ...p, id: generateId(), createdAt: now() };
      save(newP);
      return newP.id;
    },
    [save],
  );

  const updatePayment = useCallback(
    (id: string, updates: Partial<Payment>) => {
      const existing = payments.find((p) => p.id === id);
      if (!existing) return;
      save({ ...existing, ...updates, updatedAt: now() });
    },
    [payments, save],
  );

  const deletePayment = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  return { payments, addPayment, updatePayment, deletePayment };
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export function usePurchases() {
  const {
    data: purchases,
    save,
    remove,
  } = useEntityList<Purchase>("purchases");

  const addPurchase = useCallback(
    (p: Omit<Purchase, "id" | "createdAt" | "updatedAt">) => {
      const newP: Purchase = {
        ...p,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      save(newP);
      return newP.id;
    },
    [save],
  );

  const updatePurchase = useCallback(
    (id: string, updates: Partial<Purchase>) => {
      const existing = purchases.find((p) => p.id === id);
      if (!existing) return;
      save({ ...existing, ...updates, updatedAt: now() });
    },
    [purchases, save],
  );

  const deletePurchase = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  return { purchases, addPurchase, updatePurchase, deletePurchase };
}

// ─── Journal Entries ──────────────────────────────────────────────────────────

export function useJournalEntries() {
  const {
    data: entries,
    save,
    remove,
  } = useEntityList<JournalEntry>("journal");

  const addEntry = useCallback(
    (e: Omit<JournalEntry, "id" | "createdAt">) => {
      const newE: JournalEntry = { ...e, id: generateId(), createdAt: now() };
      save(newE);
      return newE.id;
    },
    [save],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  const updateEntry = useCallback(
    (id: string, updates: Partial<JournalEntry>) => {
      const existing = entries.find((e) => e.id === id);
      if (!existing) return;
      save({ ...existing, ...updates });
    },
    [entries, save],
  );

  return { entries, addEntry, updateEntry, deleteEntry };
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export function useBankAccounts() {
  const {
    data: accounts,
    save,
    remove,
  } = useEntityList<BankAccount>("bank_accounts");

  const addAccount = useCallback(
    (a: Omit<BankAccount, "id" | "createdAt">) => {
      const newA: BankAccount = { ...a, id: generateId(), createdAt: now() };
      save(newA);
      return newA.id;
    },
    [save],
  );

  const updateAccount = useCallback(
    (id: string, updates: Partial<BankAccount>) => {
      const existing = accounts.find((a) => a.id === id);
      if (!existing) return;
      save({ ...existing, ...updates });
    },
    [accounts, save],
  );

  const deleteAccount = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  return { accounts, addAccount, updateAccount, deleteAccount };
}

// ─── Bank Transactions ────────────────────────────────────────────────────────

export function useBankTransactions() {
  const {
    data: transactions,
    save,
    remove,
  } = useEntityList<BankTransaction>("bank_txns");

  const addTransaction = useCallback(
    (t: Omit<BankTransaction, "id" | "createdAt">) => {
      const newT: BankTransaction = {
        ...t,
        id: generateId(),
        createdAt: now(),
      };
      save(newT);
      return newT.id;
    },
    [save],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  const updateTransaction = useCallback(
    (id: string, updates: Partial<BankTransaction>) => {
      const existing = transactions.find((t) => t.id === id);
      if (!existing) return;
      save({ ...existing, ...updates });
    },
    [transactions, save],
  );

  return { transactions, addTransaction, updateTransaction, deleteTransaction };
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export function useAuditLogs() {
  const { data: logs, save } = useEntityList<AuditLog>("audit_logs");

  const addLog = useCallback(
    (log: Omit<AuditLog, "id" | "timestamp">) => {
      const newLog: AuditLog = { ...log, id: generateId(), timestamp: now() };
      save(newLog);
    },
    [save],
  );

  return { logs, addLog };
}

// ─── Custom Accounts ──────────────────────────────────────────────────────────

export interface CustomAccount {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  isCustom: true;
  createdAt: string;
}

export function useCustomAccounts() {
  const {
    data: customAccounts,
    save,
    remove,
  } = useEntityList<CustomAccount>("custom_accounts");

  const addAccount = useCallback(
    (a: Omit<CustomAccount, "id" | "createdAt" | "isCustom">) => {
      const newA: CustomAccount = {
        ...a,
        isCustom: true,
        id: generateId(),
        createdAt: now(),
      };
      save(newA);
    },
    [save],
  );

  const deleteAccount = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  const updateAccount = useCallback(
    (
      id: string,
      updates: Partial<Omit<CustomAccount, "id" | "isCustom" | "createdAt">>,
    ) => {
      const existing = customAccounts.find((a) => a.id === id);
      if (!existing) return;
      save({ ...existing, ...updates });
    },
    [customAccounts, save],
  );

  return { customAccounts, addAccount, updateAccount, deleteAccount };
}

// ─── Stock Movements ──────────────────────────────────────────────────────────

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
  const {
    data: movements,
    save,
    remove,
  } = useEntityList<StockMovement>("stock_movements");

  const addMovement = useCallback(
    (m: Omit<StockMovement, "id" | "createdAt">) => {
      const newM: StockMovement = { ...m, id: generateId(), createdAt: now() };
      save(newM);
    },
    [save],
  );

  const deleteMovement = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  return { movements, addMovement, deleteMovement };
}

// ─── Invoice Defaults ─────────────────────────────────────────────────────────

const DEFAULT_DECLARATION =
  "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. This is a GST compliant tax invoice.";

const DEFAULT_TERMS = `1. Payment is due within 10 days from the date of invoice.\n2. Please make all cheques payable to "BUSINESS NAME".\n3. Interest @18% p.a. will be charged on delayed payments beyond due date.\n4. Goods once sold will not be taken back or exchanged.\n5. Subject to "STATE" jurisdiction only.\n6. This is a computer-generated invoice and does not require a physical signature.`;

export interface InvoiceDefaults {
  declaration: string;
  termsConditions: string;
}

export function useInvoiceDefaults() {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  const bizId = localStorage.getItem(ACTIVE_BIZ_KEY) ?? "";

  const defaultsQuery = useQuery<InvoiceDefaults>({
    queryKey: ["bizConfig", bizId, "invoice_defaults"],
    queryFn: async () => {
      if (!actor || !bizId) {
        return {
          declaration: DEFAULT_DECLARATION,
          termsConditions: DEFAULT_TERMS,
        };
      }
      try {
        const stored = await actor.getBizConfig(bizId, "invoice_defaults");
        if (stored) return JSON.parse(stored) as InvoiceDefaults;
        return {
          declaration: DEFAULT_DECLARATION,
          termsConditions: DEFAULT_TERMS,
        };
      } catch {
        return {
          declaration: DEFAULT_DECLARATION,
          termsConditions: DEFAULT_TERMS,
        };
      }
    },
    enabled: !!actor && !isFetching && !!bizId,
    staleTime: 30_000,
  });

  const saveDefaults = useCallback(
    async (updates: Partial<InvoiceDefaults>) => {
      if (!actor || !bizId) return;
      const current = defaultsQuery.data ?? {
        declaration: DEFAULT_DECLARATION,
        termsConditions: DEFAULT_TERMS,
      };
      const updated = { ...current, ...updates };
      await actor.saveBizConfig(
        bizId,
        "invoice_defaults",
        JSON.stringify(updated),
      );
      queryClient.invalidateQueries({
        queryKey: ["bizConfig", bizId, "invoice_defaults"],
      });
    },
    [actor, bizId, defaultsQuery.data, queryClient],
  );

  return {
    defaults: defaultsQuery.data ?? {
      declaration: DEFAULT_DECLARATION,
      termsConditions: DEFAULT_TERMS,
    },
    saveDefaults,
  };
}

// ─── Invoice Counter ──────────────────────────────────────────────────────────
// Keeps a local counter in localStorage for synchronous access.
// The backend counter is updated asynchronously in the background.

export function useInvoiceCounter() {
  const { actor } = useActor();
  const bizId = localStorage.getItem(ACTIVE_BIZ_KEY) ?? "";

  // Synchronous counter using localStorage (same API as old useGSTStore)
  const getNextNumber = useCallback(
    (type: string, prefix: string): string => {
      const counterKey = `gst_${bizId || "global"}_invoice_counters`;
      const stored = localStorage.getItem(counterKey);
      const counters: Record<string, number> = stored ? JSON.parse(stored) : {};
      const current = counters[type] || 0;
      const next = current + 1;
      counters[type] = next;
      localStorage.setItem(counterKey, JSON.stringify(counters));
      const result = `${prefix}${String(next).padStart(4, "0")}`;
      // Fire-and-forget background sync to backend (non-blocking)
      if (actor && bizId) {
        actor.getNextInvoiceNumber(bizId, type, prefix).catch((err) => {
          console.warn("[useInvoiceCounter] Background sync failed:", err);
        });
      }
      return result;
    },
    [actor, bizId],
  );

  return { getNextNumber };
}

// ─── Employees ────────────────────────────────────────────────────────────────

export function useEmployees() {
  const {
    data: employees,
    save,
    remove,
  } = useEntityList<Employee>("employees");

  const addEmployee = useCallback(
    (emp: Omit<Employee, "id" | "createdAt" | "updatedAt">) => {
      const newEmp: Employee = {
        ...emp,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      save(newEmp);
      return newEmp.id;
    },
    [save],
  );

  const updateEmployee = useCallback(
    (id: string, updates: Partial<Employee>) => {
      const existing = employees.find((e) => e.id === id);
      if (!existing) return;
      save({ ...existing, ...updates, updatedAt: now() });
    },
    [employees, save],
  );

  const deleteEmployee = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  return { employees, addEmployee, updateEmployee, deleteEmployee };
}

// ─── Attendance Records ───────────────────────────────────────────────────────

export function useAttendanceRecords() {
  const {
    data: records,
    save,
    remove,
  } = useEntityList<AttendanceRecord>("attendance");

  const addRecord = useCallback(
    (r: Omit<AttendanceRecord, "id" | "createdAt" | "updatedAt">) => {
      const newR: AttendanceRecord = {
        ...r,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      save(newR);
      return newR.id;
    },
    [save],
  );

  const updateRecord = useCallback(
    (id: string, updates: Partial<AttendanceRecord>) => {
      const existing = records.find((r) => r.id === id);
      if (!existing) return;
      save({ ...existing, ...updates, updatedAt: now() });
    },
    [records, save],
  );

  const deleteRecord = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  return { records, addRecord, updateRecord, deleteRecord };
}

// ─── Leave Balances ───────────────────────────────────────────────────────────

export function useLeaveBalances() {
  const { data: balances, save } =
    useEntityList<LeaveBalance>("leave_balances");

  const addBalance = useCallback(
    (b: Omit<LeaveBalance, "id" | "createdAt" | "updatedAt">) => {
      const newB: LeaveBalance = {
        ...b,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      save(newB);
      return newB.id;
    },
    [save],
  );

  const updateBalance = useCallback(
    (id: string, updates: Partial<LeaveBalance>) => {
      const existing = balances.find((b) => b.id === id);
      if (!existing) return;
      save({ ...existing, ...updates, updatedAt: now() });
    },
    [balances, save],
  );

  return { balances, addBalance, updateBalance };
}

// ─── Payroll Runs ─────────────────────────────────────────────────────────────

export function usePayrollRuns() {
  const {
    data: runs,
    save,
    remove,
  } = useEntityList<PayrollRun>("payroll_runs");

  const addRun = useCallback(
    (r: Omit<PayrollRun, "id" | "createdAt" | "updatedAt">) => {
      const newR: PayrollRun = {
        ...r,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      save(newR);
      return newR.id;
    },
    [save],
  );

  const updateRun = useCallback(
    (id: string, updates: Partial<PayrollRun>) => {
      const existing = runs.find((r) => r.id === id);
      if (!existing) return;
      save({ ...existing, ...updates, updatedAt: now() });
    },
    [runs, save],
  );

  const deleteRun = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  return { runs, addRun, updateRun, deleteRun };
}
