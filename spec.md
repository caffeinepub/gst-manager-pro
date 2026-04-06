# GST Manager Pro

## Current State

Version 56 is deployed. The app is a full-stack ICP application with:
- Motoko backend using generic entity store (saveEntityRecord/getAllEntityRecords) for all per-business data
- React/TypeScript frontend with ~70 page components
- Internet Identity authentication
- useBackendStore.ts as the central data store (replaces localStorage)
- DataImport, OCRCapture, Parties, Items, Invoicing, Payroll, Accounting, GST Compliance modules all present

## Requested Changes (Diff)

### Add
- Import Data support for Parties and Items (currently broken - just console.info)
- Import Data duplicate detection for Parties (by name+GSTIN) and Items (by name+HSN)

### Modify
- DataImport: Fix `parties` and `items` import cases to actually call `addParty`/`addItem` hooks
- DataImport: Add `useParties` and `useItems` hooks to the component and pass to `importRow`
- DataImport: Fix Tesseract.js CDN path (v5 in DataImport, should be v4 to match OCRCapture)
- DataImport: Fix duplicate detection for Parties (match by GSTIN or name) and Items (match by name)
- OCRCapture: Verify v4 CDN paths are correct (already done in v42, confirm)
- All modules: Verify they compile and render without errors

### Remove
- Nothing removed

## Implementation Plan

1. Fix DataImport.tsx:
   a. Import `useParties` and `useItems` from `@/hooks/useGSTStore`
   b. Add them to `ModuleImportPanel` component
   c. Add `addParty` and `addItem` to `ImportHooks` type
   d. Pass `addParty` and `addItem` from `ModuleImportPanel` to `importRow`
   e. Fix `parties` case in `importRow` to call `hooks.addParty(...)` with proper field mapping
   f. Fix `items` case in `importRow` to call `hooks.addItem(...)` with proper field mapping
   g. Fix duplicate detection for parties (check by gstin or name) and items (check by name)
   h. Fix Tesseract.js CDN from v5 to v4 with matching worker/core paths

2. Verify OCRCapture.tsx already uses v4 correctly

3. Verify BusinessProfile update saves correctly (updateBusiness called)

4. Validate/build the frontend
