# GST Manager Pro

## Current State

The app has a functional React/TypeScript frontend with a Motoko ICP backend. Most build/compile errors are absent, but many modules are functionally broken at runtime due to a fundamental data store inconsistency:

- **Legacy data store** (`useQueries.ts`): Parties, Items, and TaxRates use the legacy structured backend with **Nat/bigint IDs** and shared (non-per-business) storage.
- **Modern entity store** (`useBackendStore.ts`): Invoices, Purchases, Payroll, Accounting, and all other modules use a generic per-business entity store with **string IDs** and full business isolation.

This mismatch means:
1. `InvoiceForm` loads parties/items via `useQueries.ts` (bigint IDs) but saves line items referencing those IDs. The `InvoiceList`/`Dashboard` then tries to match them against a different store — so cross-references always fail (stock calculation, party display, etc.).
2. `Items.tsx` calls `getClosingStock(itemId, openingStock)` comparing bigint IDs against string IDs from invoices — always returns the opening stock, never updating.
3. `GSTINPANVerification.tsx` reads/writes `localStorage.getItem('parties')` — an old key that no module writes to anymore.
4. `BusinessProfile.tsx` saves GSTIN/state/name to `localStorage.setItem('gst_business_profile', ...)` instead of going through `updateBusiness()` in the context, so other modules reading from business context see stale data.
5. `AutomatedUAT.tsx` still uses direct `localStorage.setItem(...)` for seed data injection — since the app now uses the backend, the injected data is never visible in any module.
6. Several pages import both `useQueries` (legacy) and `useGSTStore` (modern) for the same entity type, leading to double state issues.

## Requested Changes (Diff)

### Add
- `useParties`, `useItems`, `useTaxRates` hooks in `useBackendStore.ts` using the generic string-ID entity store (per-business), replacing the legacy bigint versions.
- `useLanguage` context/hook placeholder if missing (referenced in App.tsx but may be absent).

### Modify
- `useBackendStore.ts`: Add `useParties`, `useItems`, `useTaxRates` with string IDs using `useEntityList`. Define matching TS types (Party, Item, TaxRate) as frontend-only interfaces (not importing from backend.d.ts which uses bigint).
- `useGSTStore.ts`: Re-export the new `useParties`, `useItems`, `useTaxRates` alongside existing exports.
- `Parties.tsx`: Remove all `useQueries` imports; use new `useParties` from `useGSTStore`. Remove bigint types; use plain string IDs throughout.
- `Items.tsx`: Remove all `useQueries` imports; use new `useItems` from `useGSTStore`. Fix `getClosingStock` to compare string IDs correctly.
- `TaxRates.tsx`: Remove all `useQueries` imports; use new `useTaxRates` from `useGSTStore`. Use string IDs.
- `InvoiceForm.tsx`: Import parties/items from `useGSTStore` (string IDs) instead of `useQueries`.
- `Purchases.tsx`: Import parties/items from `useGSTStore` instead of `useQueries`.
- `Dashboard.tsx`: Import parties/items from `useGSTStore` instead of `useQueries`.
- `Reports.tsx`: Remove `useBusinessProfile` from `useQueries`; read business info from `useBusinessContext` instead.
- `StockSummary.tsx`: Import items from `useGSTStore` instead of `useQueries`.
- `OCRCapture.tsx`: Import parties from `useGSTStore` instead of `useQueries`.
- `InventoryERP.tsx`: Import items from `useGSTStore` instead of `useQueries`.
- `GSTINPANVerification.tsx`: Replace localStorage party reads/writes with `useParties` from `useGSTStore`.
- `BusinessProfile.tsx`: Save GSTIN, businessName, stateCode to `updateBusiness()` in addition to the existing backend call. Remove direct localStorage `gst_business_profile` write; use the business context as the source of truth.
- `AutomatedUAT.tsx`: Replace direct localStorage writes with calls to the entity store save functions (via the hooks) so seed data actually appears in the modules.
- `useQueries.ts`: Deprecate `useParties`, `useItems`, `useTaxRates` exports (make them re-export from useBackendStore) to avoid breaking any remaining imports.

### Remove
- Direct `localStorage.getItem('parties')` / `localStorage.setItem('parties', ...)` calls in GSTINPANVerification.
- Direct `localStorage.setItem('gst_business_profile', ...)` in BusinessProfile (the context is the authoritative store).

## Implementation Plan

1. **useBackendStore.ts**: Add `GSTParty`, `GSTItem`, `GSTTaxRate` interfaces with string IDs. Add `useParties`, `useItems`, `useTaxRates` hooks using `useEntityList`.
2. **useGSTStore.ts**: Add re-exports for the new hooks.
3. **useQueries.ts**: Update `useParties`, `useItems`, `useTaxRates` to re-export from `useBackendStore` so all existing imports resolve to the new string-ID versions without file-by-file import surgery everywhere.
4. **Parties.tsx**: Refactor to use `useParties` from `useGSTStore` with string IDs. Remove all bigint types and legacy `useQueries` hooks.
5. **Items.tsx**: Same as Parties. Fix stock calculation.
6. **TaxRates.tsx**: Same as Parties.
7. **InvoiceForm.tsx, Purchases.tsx, Dashboard.tsx, StockSummary.tsx, OCRCapture.tsx, InventoryERP.tsx**: Update party/item imports to use `useGSTStore` hooks instead of `useQueries`.
8. **BusinessProfile.tsx**: After saving business details, call `updateBusiness()` on the active business with the new name/GSTIN/stateCode so the sidebar/header reflect the change immediately.
9. **GSTINPANVerification.tsx**: Use `useParties` from `useGSTStore` for save-to-party logic.
10. **AutomatedUAT.tsx**: Rewrite seed injection to use the backend store hooks.
11. **Validate**: Run typecheck and build; fix any remaining errors.
