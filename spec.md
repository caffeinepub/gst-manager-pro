# GST Manager Pro

## Current State

Version 32 is deployed. The app is a comprehensive GST compliance & accounting application with the following modules:
- Masters: Business Profile, Parties, Items, Tax Rates, Chart of Accounts
- Invoicing: Sales/Purchase invoices, Credit/Debit notes, Print, PDF
- Accounting: CashBook, Bank Reconciliation, Journal Entries, RCM Tracker, Audit Trail, Bank Accounts
- GST Compliance: GSTR-1, GSTR-3B, e-Invoice IRN, e-Way Bill, GST API Integration, ITC Reconciliation, Audit Trail, RCM Tracker, Workflow Automation
- Reporting: Sales/Purchase registers, P&L, Balance Sheet, Stock Summary, Cash Flow
- Automation & AI: AI Tax Assistant, OCR Capture, Workflow Automation
- Settings: Backup/Restore, API Config, Preferences, Data Import
- Cloud Sync: Real-time ICP sync with status in header

Data Import (Settings > Import Data) exists but only supports .xlsx, .csv, .json file formats.
OCR Capture exists but real-time API calls and some modules have incomplete/broken integrations.
Mobile navigation was fixed in Version 32 but some API interactions may be broken.

## Requested Changes (Diff)

### Add
- **Data Import: JPG/Image support** — allow importing invoice images (JPG, PNG, WEBP) in the DataImport page via OCR extraction (using Tesseract.js) to extract tabular data and map to the selected module
- **Data Import: PDF support** — allow importing PDF files in the DataImport page via PDF.js + OCR extraction (same pipeline as OCR Capture) to extract data rows and map to modules
- **Data Import: enhanced UI** — show accepted file types clearly including image and PDF
- **Real-time API completeness** — ensure all real-time hooks (useGSTStore, useCloudSync, useInternetIdentity) are fully wired: sync triggers on every data mutation, optimistic UI for all CRUD operations, error recovery
- **Module completeness sweep** — audit and fix every module's CRUD, ensuring add/edit/delete all work and persist correctly in localStorage, and sync to cloud

### Modify
- **DataImport.tsx** — extend file parser to accept .jpg, .jpeg, .png, .webp, .pdf; for images/PDFs run Tesseract.js OCR and attempt to map extracted text to template headers; show a field-mapping review step before confirming import
- **DataImport.tsx** — fix duplicate detection for parties and items (currently returns false for all — should check localStorage for existing names/codes)
- **DataImport.tsx** — fix cashbook import to handle both credit/debit properly
- **OCRCapture.tsx** — ensure save workflow (save as Sales Invoice, Purchase Entry, etc.) is fully functional end-to-end
- **All CRUD modules** — ensure addParty, addItem mutations in Parties/Items pages fire localStorage writes and trigger cloud sync
- **useGSTStore.ts** — verify all store hooks expose stable add/update/delete functions and they persist correctly
- **CloudSyncStatus.tsx** — already correct; ensure it mounts and is visible in header
- **AppLayout.tsx** — ensure bottom nav on mobile works and all tabs are accessible with horizontal scroll
- **GSTR1.tsx / GSTR3B.tsx** — ensure auto-generation pulls from real invoice/purchase data in store
- **WorkflowAutomation.tsx** — ensure real-data triggers work (GSTR deadlines, overdue invoices, e-Way expiry)
- **AIAssistant.tsx** — ensure live queries work against localStorage data
- **BankReconciliation.tsx** — ensure CSV import, auto-match, export all work
- **Reports.tsx** — ensure all exports (CSV, Excel, PDF) work
- **InvoiceForm.tsx** — ensure CGST/SGST/IGST auto-calculation is correct on all line item changes

### Remove
- Nothing to remove

## Implementation Plan

1. **DataImport.tsx — image/PDF OCR import**
   - Add .jpg/.jpeg/.png/.webp/.pdf to accepted file types
   - For image files: load into canvas, run Tesseract.js, parse extracted text into rows using header matching heuristics
   - For PDF files: use PDF.js to render first page to canvas, then run same OCR pipeline
   - After OCR extraction, show a column-mapping step: list detected columns, let user map each to template header
   - Integrate with existing confirm/import flow

2. **DataImport.tsx — duplicate detection fix**
   - Parties: check localStorage gst_parties and gst_parties_import by name
   - Items: check localStorage gst_items and gst_items_import by name

3. **DataImport.tsx — cashbook fix**
   - Use `debit` for payments and `credit` for receipts correctly

4. **useGSTStore.ts — verify all mutations**
   - Ensure addParty, updateParty, deleteParty all persist to localStorage key `gst_parties`
   - Same for items (`gst_items`)
   - All mutations should dispatch a `storage` event so other hooks/components react

5. **OCRCapture.tsx — fix save workflow**
   - After extraction, the document type selector and save button must fire the appropriate store mutation
   - Show success toast and reset form after save

6. **GSTR-1 / GSTR-3B — real data verification**
   - Confirm computations use `useInvoices().invoices` and `usePurchases().purchases`
   - Fix any filter or reduce bugs

7. **Workflow Automation — real triggers**
   - Compute GSTR-1 deadline as 11th of next month from latest invoice date
   - Count overdue invoices from store
   - Show real numbers in alert cards

8. **AI Assistant — live query fix**
   - Ensure GSTIN validation, overdue count, GST liability, ITC balance queries read from real store data

9. **Reports — export verification**
   - Ensure SheetJS CDN loads before Excel export
   - Ensure jsPDF print export uses correct branding

10. **Full regression pass** — verify every page renders without crash, all navigation tabs accessible, form submissions persist data, branding consistent
