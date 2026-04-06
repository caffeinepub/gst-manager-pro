# GST Manager Pro

## Current State

The app has:
- A Motoko backend with: BusinessProfile, Party, Item, TaxRate CRUD, UserProfile, and a generic key-value cloud sync store (`saveCloudData`/`getCloudData`). Authorization (role-based) is already wired.
- A frontend that uses localStorage exclusively for all app data (invoices, purchases, journal entries, bank accounts, employees, payroll runs, attendance, audit logs, cashbook, etc.) via `useGSTStore.ts` and `useBusinessContext.ts`.
- Internet Identity already integrated (`useInternetIdentity.ts`, `useActor.ts`).
- Multi-business support in localStorage (business-prefixed keys).

## Requested Changes (Diff)

### Add
- Backend Motoko types and CRUD for all missing data entities:
  - **Business** (multi-business per user, tied to caller Principal)
  - **Invoice** (all invoice types: sales, service, proforma, credit note, debit note, etc.)
  - **Purchase** (purchase bills)
  - **CashBook entry** (cash transactions)
  - **JournalEntry** (with lines)
  - **BankAccount** + **BankTransaction**
  - **Employee** (full payroll employee fields)
  - **AttendanceRecord** (per employee per month)
  - **LeaveBalance**
  - **PayrollRun** (with lines)
  - **AuditLog**
  - **InvoiceDefaults** (declaration, T&C per business)
  - **ApiSettings** (API keys per business)
  - **BusinessBranding** (font, theme, colors per business)
  - **Payment**
  - **StockMovement**
  - **CustomAccount** (chart of accounts custom entries)
  - **InvoiceCounter** (per-type invoice numbering)
- All entities are scoped per-caller (Principal) and per-business (businessId: Text)
- Internet Identity as the sole authentication method (remove old local login)

### Modify
- `useGSTStore.ts` hooks: replace localStorage reads/writes with backend actor calls
- `useBusinessContext.ts`: replace localStorage with backend actor (CRUD for businesses)
- `useInvoiceDefaults`, `useInvoiceCounter`: wire to backend
- `Login.tsx`: replace username/password login with Internet Identity login button
- All data hooks return loading states (async backend calls)

### Remove
- Cloud sync (`useCloudSync.ts`, `useBackup.ts` localStorage-based sync)
- localStorage dependency for all app data (keep only for UI preferences like active tab)

## Implementation Plan

1. **Backend**: Extend `main.mo` with all new types and CRUD operations, each scoped by `caller` (Principal) and `businessId` (Text). Use `Map.Map` per principal per business.
2. **Frontend hooks**: Create new `useBackendStore.ts` that wraps each backend actor call as React Query-powered async hooks, exposing the same API shape as the existing `useGSTStore.ts` hooks so page components need minimal changes.
3. **Auth gate**: App wraps in `InternetIdentityProvider`. If not authenticated, show Login page with single "Login with Internet Identity" button.
4. **Business context**: `useBusinessContext` switches to reading/writing via backend actor, with React Query for caching.
5. **Page components**: Minimal changes - only those that directly call `useLocalStorage` for app data need to be updated. All `useGSTStore` hook consumers should work with the new async hooks with added loading spinners.
6. **Remove**: `useCloudSync.ts`, `useBackup.ts` cloud sync logic, `BackupRestore.tsx` cloud section.
