# GST Manager Pro

## Current State
Version 39 is deployed. The app is a comprehensive GST Compliance & Accounting application with 25+ modules. A thorough source-code audit has identified 40+ specific bugs, compliance gaps, and broken features across all modules. Key categories of issues:

- **Critical data integrity**: BusinessProfile localStorage schema mismatch (`name` vs `businessName`) breaks Business Profile display after UAT seed injection
- **GST compliance violations**: GSTR-1 `fp` period format is wrong (produces `2026-03` instead of `032026`); P&L income includes GST (inflates revenue); B2CS groups by first item rate only; ITC cross-utilization not implemented
- **OCR pipeline**: `tesseract.js-core@5.0.0` doesn't match `tesseract.js@5.0.4` — causes repeated version mismatch crash; OCR-saved invoices have empty `partyId`
- **PDF/Print**: `HUXLEY_FONT = "helvetica"` in pdfExport.ts — Huxley Titling never used in PDFs; `.print-only` content permanently visible on screen
- **Fake API labels**: IRN and e-Way Bill "Generate" buttons create random local numbers with no disclaimer; GSTIN "validation" shows fake taxpayer names
- **CashBook**: Running balance ignores account opening balance; filtered view shows wrong balance
- **Bank Reconciliation**: Auto-match ignores date — only matches by amount
- **Stock**: Items list shows static opening stock, not live closing stock from InventoryERP
- **DataImport**: XLSX version mismatch (0.18.5 vs 0.20.2 across files)
- **Dependencies**: xlsx, jspdf, tesseract.js, pdfjs-dist not in package.json — CDN-only
- **Unused 3D deps**: @react-three/* and react-quill-new add bundle weight for unused features

## Requested Changes (Diff)

### Add
- `GSTR-1 fp` field corrected to GSTN format `MMYYYY` (e.g., `032026`)
- `GSTR-1 B2CS` correct multi-rate bucketing per invoice line item
- `GSTR-3B` ITC cross-utilization: IGST offsets CGST/SGST before respective credits; RCM IGST included
- `CashBook` opening balance from `BankAccount.openingBalance` factored into running balance
- `BankReconciliation` auto-match checks date ±3 days AND amount
- `Items` list shows live closing stock from inventory calculations
- `BusinessProfile` localStorage schema unified (`businessName` key used everywhere including UAT seed)
- `AutomatedUAT` seed data schema corrected to match all hook expectations
- `OCRCapture` corePath version aligned to `tesseract.js-core@5.0.4`; OCR-saved invoices populate `partyId` via GSTIN lookup
- `pdfExport.ts` embed Huxley Titling as base64 font for jsPDF; fallback to Cinzel
- `index.css` add `.print-only { display: none !important; }` for screen view; shown only `@media print`
- `InvoiceForm` IRN and e-Way Bill generate buttons clearly labeled as "Simulate / Local" with disclaimer
- `Reports` P&L income uses `subtotal - discount` (pre-GST taxable amount)
- `DataImport` unify XLSX CDN to SheetJS 0.20.2 matching exportUtils
- `BusinessProfile` GSTIN validation blocks save on invalid format
- `seedInitialData` in App.tsx guard to not overwrite existing data
- `Parties` GSTIN validation labeled clearly as format-check only
- `package.json` add xlsx, jspdf, jspdf-autotable, html2canvas, tesseract.js, pdfjs-dist as proper npm dependencies
- Remove unused @react-three/*, three, react-quill-new dependencies

### Modify
- `useGSTStore.ts`: add `updatePayment` to `usePayments`; include audit logs in cloud sync
- `InvoiceForm.tsx`: set `linkedInvoiceNumber` when saving credit/debit notes; remove fake voice capture stub
- `GSTAPIIntegration.tsx`: all simulated cards clearly labeled "Demo/Simulation" with info tooltip
- `InventoryERP.tsx`: add warehouse field to stock movements (basic multi-warehouse scaffold); add BOM placeholder with real data model
- `WorkflowAutomation.tsx`: add service-worker-based scheduling for real background alerts
- `pdfExport.ts`: fix multi-page PDF clipping loop
- `exportUtils.ts`: move PDF pagination to correct slicing

### Remove
- Dead `CashTransaction` type usage confusion (keep type for future use, add JSDoc)
- Remove fake `HUXLEY_FONT = "helvetica"` constant replaced with embedded font

## Implementation Plan

1. **package.json**: Add xlsx@0.20.3, jspdf@2.5.1, jspdf-autotable@3.8.2, html2canvas@1.4.1, tesseract.js@5.0.4, pdfjs-dist@3.11.174 as real npm deps. Remove @react-three/cannon, @react-three/drei, @react-three/fiber, three, @types/three, react-quill-new.

2. **types/gst.ts**: Mark `irnNumber` and `eWayBillNumber` as optional (`?`). Add `updatedAt` to `BankAccount`. Add `warehouse` field to `StockMovement`.

3. **useGSTStore.ts**: Add `updatePayment` to `usePayments`. Fix audit logs to be included in cloud sync scope.

4. **index.css**: Add `.print-only { display: none !important; }` for screen; `@media print { .print-only { display: block !important; } .no-print { display: none !important; } }`

5. **BusinessProfile.tsx**: Unify localStorage key to use `businessName` field consistently. Block save on invalid GSTIN format. Fix bank sync to use `addAccount`/`updateAccount` hooks.

6. **AutomatedUAT.tsx**: Fix seed data to use correct schema matching all hooks (`businessName` not `name`, correct party/item/invoice field names matching types).

7. **App.tsx**: Guard `seedInitialData()` to only run when localStorage is empty (first run only).

8. **InvoiceForm.tsx**: Set `linkedInvoiceNumber` on save for credit/debit notes. Remove fake voice capture. Label IRN/eWayBill generate as "Simulate (Local)" with disclaimer badge. Fix partial Invoice cast for PDF preview.

9. **GSTR1.tsx**: Fix `fp` format to `MMYYYY`. Fix B2CS to bucket by each line item rate, not first item only. Add Excel export. Fix simulated filing to show clear "DEMO" label.

10. **GSTR3B.tsx**: Implement ITC cross-utilization (IGST offsets CGST/SGST first). Include RCM IGST. Label simulated filing as "DEMO".

11. **CashBook.tsx**: Factor `account.openingBalance` into running balance. Fix filtered view to include prior transactions in balance calculation.

12. **BankReconciliation.tsx**: Add date ±3 day check to auto-match alongside amount. Persist matched transactions to localStorage. Add "Mark Reconciled" UI action.

13. **Items.tsx**: Compute live closing stock using same formula as InventoryERP. Show live stock in badges.

14. **OCRCapture.tsx**: Align corePath to `tesseract.js-core@5.0.4`. After OCR save, look up party by GSTIN in `useParties` store and populate `partyId`.

15. **DataImport.tsx**: Unify XLSX CDN to SheetJS 0.20.2.

16. **pdfExport.ts**: Embed Huxley Titling font from the public assets as base64 or use `doc.addFont`. Fix multi-page slicing loop. Use portrait for reports.

17. **Reports.tsx**: Fix P&L income to use `subtotal - discount`. Fix Balance Sheet receivables. Move FilterBar component outside render function.

18. **GSTAPIIntegration.tsx**: Add clear "Simulation Mode" banners on all cards. Keep functionality but clearly communicate it's demo data.

19. **Parties.tsx**: Add label "Format validation only — GSTN API validation requires API key in Settings" next to GSTIN validate button.

20. **InventoryERP.tsx**: Add basic warehouse field scaffold; add BOM section with real data model for bill of materials.

21. **WorkflowAutomation.tsx**: Register a service worker message for deadline alerts; implement `setInterval`-based check on app load for near-due alerts.
