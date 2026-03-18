# GST Manager Pro

## Current State
- OCRCapture.tsx uses Tesseract.js 5.0.4 + PDF.js 3.11.174 to extract invoice data from PDFs/images
- Extracts: vendorName, invoiceNo, date, amount, taxAmount, hsnCodes, gstin — but item descriptions are missing, date/amount/tax patterns are unreliable for Indian invoices
- After OCR, only one save option: "Create Purchase Entry" via sessionStorage prefill — no Sales Invoice, Proforma, Credit/Debit Note options
- No Data Import module exists anywhere

## Requested Changes (Diff)

### Add
- Item/service description line extraction in OCR (parse line item rows from PDF text, extract description, HSN, qty, rate, amount)
- Full editable review form after OCR with all fields: vendor, GSTIN, invoice no, date, line items table (description, HSN, qty, unit, rate, GST rate), tax breakdown, grand total
- Document type selector in OCR review form: Sales Invoice, Service Invoice, Proforma Invoice, Purchase Entry, Credit Note, Debit Note, Quotation
- Direct save to the selected module using useGSTStore hooks (addInvoice / addPurchase)
- New "Import Data" page under Settings (route: settings-import)
  - Supports Excel (.xlsx), CSV, JSON file uploads
  - Modules: Parties, Items, Sales Invoices, Purchase Entries, Chart of Accounts, CashBook Transactions
  - Merge mode: skip duplicates (matched by invoice number / party name / account code)
  - Show import preview table and summary (imported / skipped / errors) before confirming
- Add "Import Data" link in Settings sidebar and AppSidebar navigation

### Modify
- OCR date regex: add support for written dates ("05 Feb 2026", "February 5, 2026", "5th February 2026")
- OCR amount regex: improve grand total detection ("Amount Payable", "Net Payable", "Total Due", "Invoice Total", "Balance Due", "Total Payable")
- OCR tax regex: sum CGST + SGST + IGST individually and present as separate fields in review form
- OCR item extraction: scan PDF text for tabular line item patterns (description followed by HSN, qty, rate, amount on same/adjacent line)
- Save flow: replace sessionStorage prefill approach with direct in-component save using useGSTStore
- App.tsx: add route for settings-import
- AppSidebar.tsx: add "Import Data" menu item under Settings section

### Remove
- sessionStorage ocr_prefill hack (replaced by direct save)

## Implementation Plan
1. Rewrite OCRCapture.tsx:
   a. Improved regex extraction (dates, amounts, taxes, item descriptions)
   b. Line item parser: detect table rows in OCR text, extract description/HSN/qty/rate per row
   c. Build full editable review form (React state for all fields, line items editable table)
   d. Document type selector dropdown
   e. Save handler: construct Invoice or Purchase object and call addInvoice/addPurchase
2. Create new DataImport.tsx page under src/pages/Settings/:
   a. File upload with format detection (xlsx/csv/json)
   b. Module selector (which data type is being imported)
   c. Template download links (sample CSV/Excel per module)
   d. Parse uploaded file into preview table
   e. Duplicate detection logic per module
   f. Confirm import: write to useGSTStore, show summary
3. Update App.tsx: add settings-import route
4. Update AppSidebar.tsx: add Import Data nav item under Settings
5. Update AppPage type in gst.ts to include 'settings-import'
