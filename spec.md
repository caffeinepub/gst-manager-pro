# GST Manager Pro

## Current State
Fully-featured GST Compliance & Accounting application with ICP backend (Motoko canister), Internet Identity auth, multi-business support, Payroll, OCR, Communication Hub, and more. All data stored in ICP backend via `useBackendStore.ts`; localStorage used only for UI state. Build passes cleanly (lint + typecheck + build).

## Requested Changes (Diff)

### Add
- `reconciled` field to `BankTransaction` type in `gst.ts` and `useBackendStore.ts`
- `"communication"` to `AppPage` type in `gst.ts` (currently missing, causes silent routing failure)
- Edit button for CashBook transactions
- Edit button for Journal Entries
- Edit button for Payments
- Date range filter for CashBook
- Running balance in BankAccounts (current balance = opening + credits - debits)
- Custom accounts merged into JournalEntries account dropdown
- "Send Payslip" button on Payslips that opens CommunicationHub with pre-filled employee/payslip
- isActive: true default in DataImport when saving imported records
- Export CSV for StockSummary and CashFlow
- Real InvoiceList send action: pass invoice context to CommunicationHub (instead of just navigating)
- Excel export for Reports (in addition to CSV)
- Payroll bulk import from CSV

### Modify
- **AutomatedUAT**: Rewrite `injectSeedData()` to call backend store hooks (`addParty`, `addItem`, `addInvoice`, etc.) instead of localStorage. Fix party type: use `partyType: "vendor"` not `type: "supplier"`. Fix item type: `itemType: "goods"/"service"` not `type`. Fix `verifySeeds()` to read from backend store state. UAT test assertions must check React Query cache, not localStorage.
- **CommunicationHub**: Replace all `localStorage.getItem("gst_${bizId}_invoices")` and `localStorage.getItem("gst_${bizId}_employees")` with hooks: `useInvoices()`, `useEmployees()`. Fix `channelConfigured(cfg, "email")` logic: check `cfg.email?.key` not `cfg.sms?.key`. Persist communication logs via backend entity store (`useEntityList("comm_logs")`), not localStorage.
- **InvoiceForm**: Replace `JSON.parse(localStorage.getItem("gst_invoices"))` linked-invoice lookup with `useInvoices()` hook. FY reset banner: use `useLocalStorage` scoped with bizId prefix. IRN/eWayBill generation buttons: label them clearly as "Generate (Simulation)" and add info toasts explaining they are not real government registrations.
- **Purchases**: Remove the fake `setTimeout` OCR stub in `handleOcrScan`. Replace with a real simple file reader that triggers the same OCR pipeline used in `OCRCapture.tsx` (Tesseract.js v4). Add `Place of Supply` field to the purchase form; auto-calc IGST when place of supply differs from business state.
- **BankReconciliation**: Fix `updateTransaction(id, { reconciled: !txn.reconciled })` — the `reconciled` field is missing from the type; add it to `BankTransaction` type and the entity store.
- **BankAccounts**: Fix `totalBalance` to compute real-time balance (opening balance + credits - debits from `useBankTransactions`).
- **GSTR1 + GSTR3B filing status**: Move from `useLocalStorage("gst_gstr1_status", {})` (not business-prefixed) to `useEntityList<object>("gstr_status")` from backend store. Filing action must clearly label as "Mark as Filed" (not imply actual GSTN submission).
- **RCMTracker paidRcm**: Move from `useLocalStorage("rcm_paid_ids", [])` to backend entity store `useEntityList("rcm_paid")`.
- **Preferences**: Move from `useLocalStorage("gst_preferences", DEFAULTS)` to `useBizConfig(bizId, "preferences")` backend config.
- **WorkflowAutomation**: Move workflow enabled/disabled states from `useLocalStorage("gst_workflow_states", {})` to `useBizConfig(bizId, "workflow_states")`.
- **AuditTrail**: Fix duplicate entries by removing the `syntheticLogs` computation that creates entries on every render. Only show real logs from the `useAuditLogs()` hook. Add entity type filter dropdown.
- **BackupRestore**: Fix local backup to export real data: iterate all entity types from the backend store (query all known entity types for the active bizId) and include in the backup JSON. Cloud restore must call `queryClient.invalidateQueries()` after restore to refresh UI.
- **DataImport**: Standardize Tesseract.js version to `4.1.4` across DataImport and OCRCapture. Ensure all import handlers set `isActive: true` on imported records.
- **OCRCapture**: Import `INDIAN_STATES` from `@/types/gst` instead of redeclaring. Fix `vendorId` assignment: if GSTIN match fails, still save the OCR-extracted vendor name as a pending party name string.
- **BusinessSetupWizard**: Add GSTIN duplicate check on Step 2 before proceeding.
- **BusinessManager**: Add defensive check on `handleDelete` — if deleting the active business, switch to another business before deleting, or redirect to setup wizard if no others exist.
- **Payslips**: Use `activeBusiness?.name` with a non-null fallback from the hook (should be loaded by the time payslips are rendered).
- **Payroll StatutoryCompliance**: Change stub `toast.info("Feature available with statutory filing integration")` to clearly labeled demo buttons — "Generate (Demo Mode)" with description of what the real file would contain, so users understand what the output would be.
- **Header + Dashboard overdue count**: Deduct payments from outstanding invoice total. `overdueInvoices` should filter by `status === "confirmed"` AND no payment record exists covering full balance (or use a simpler approach: if `payments.filter(p => p.invoiceId === inv.id).reduce(...)` >= inv.grandTotal, skip it).
- **seedData.ts**: Fix seed party types (`partyType: "vendor"`) and item types (`itemType: "goods"/"service"`). Add valid partyId references in seed invoices.
- **useBackendStore `useEntityList`**: On mutation failure, call `queryClient.invalidateQueries()` to force a re-fetch (roll back optimistic update). Show a `toast.error` on failure.
- **AppPage type**: Add `"communication"` to the union type.
- **BankTransaction type**: Add `reconciled?: boolean` field.

### Remove
- Direct `localStorage.getItem` / `setItem` calls for app data in: CommunicationHub, InvoiceForm (linked-invoice lookup), GSTR1, GSTR3B, RCMTracker, WorkflowAutomation, Preferences, AuditTrail (synthetic logs)
- Fake setTimeout OCR stub in Purchases.tsx

## Implementation Plan

1. **types/gst.ts** — Add `"communication"` to AppPage union. Add `reconciled?: boolean` to BankTransaction.
2. **useBackendStore.ts** — On entity mutation failure: call `queryClient.invalidateQueries` (rollback). Add `useBizConfig` helper for reading/writing per-business config strings from backend.
3. **seedData.ts** — Fix all type field names. Make seed functions async and call real backend store hooks.
4. **AutomatedUAT.tsx** — Rewrite seed injection to use real store hooks. Fix test assertions to check hook state.
5. **CommunicationHub.tsx** — Replace localStorage reads with hooks. Fix email channel check. Persist logs via backend entity store.
6. **InvoiceForm.tsx** — Fix linked invoice lookup. Fix FY banner localStorage key (bizId-prefix). Relabel IRN/eWayBill as simulation.
7. **Purchases.tsx** — Replace fake OCR stub with real Tesseract call. Add Place of Supply field.
8. **BankAccounts.tsx** — Fix totalBalance computation.
9. **BankReconciliation.tsx** — Add `reconciled` field usage.
10. **GSTR1.tsx + GSTR3B.tsx** — Move filing status to backend entity store.
11. **RCMTracker.tsx** — Move paidRcm to backend entity store.
12. **WorkflowAutomation.tsx** — Move workflow states to backend biz config.
13. **Preferences.tsx** — Move preferences to backend biz config.
14. **AuditTrail.tsx** — Remove synthetic logs generation. Add entity type filter.
15. **BackupRestore.tsx** — Fix backup to export from entity store. Fix restore to invalidate queries.
16. **DataImport.tsx** — Fix Tesseract version. Add `isActive: true` to all imports.
17. **OCRCapture.tsx** — Import INDIAN_STATES. Fix vendorId fallback.
18. **CashBook.tsx** — Add Edit button. Add date range filter.
19. **JournalEntries.tsx** — Add Edit button. Merge custom accounts into dropdown.
20. **Payments.tsx** — Add Edit button. Add outstanding balance column.
21. **Header.tsx + Dashboard.tsx** — Fix overdue count to subtract payments.
22. **BusinessSetupWizard.tsx** — Add GSTIN duplicate check.
23. **BusinessManager.tsx** — Fix delete-active-business guard.
24. **Payslips.tsx** — Business name null safety.
25. **Reports.tsx** — Add Excel export. Fix P&L COGS calculation.
26. **StockSummary.tsx + CashFlow.tsx** — Add CSV export.
