# GST Manager Pro - Full Functionality Audit & Enhancement

## Current State

Full GST compliance & accounting application with:
- Dashboard with KPI cards, workflow alerts, anomaly detection, predictive cash flow
- Masters: Business Profile, Parties (with GSTIN validation), Items & Services, Tax Rates
- Invoicing: 8 invoice types (sales, service, quotation, proforma, credit/debit notes, bill of supply, delivery challan), Payments
- Accounting: Purchases (with OCR scan), Journal Entries, Bank Accounts, Cash Book, Chart of Accounts, Bank Reconciliation
- GST Compliance: GSTR-1 (with auto-filing), GSTR-3B (with auto-generation), ITC Reconciliation, RCM Tracker, Audit Trail, API Integration, Workflow Automation
- Reports: Sales/Purchase Register, GST Summary, AR/AP Ageing, Trial Balance, P&L, Balance Sheet, Stock Summary, Cash Flow
- AI Tax Assistant (26 Q&A + free-form chat)
- Mobile responsive with bottom nav bar, overflow-x-auto on tables

## Requested Changes (Diff)

### Add
- **Invoice print view**: Full-featured print layout for Sales & Service invoices with business header, GSTIN, party details, line items table, tax summary, amount-in-words, terms & IRN/QR placeholder
- **Payments page - Link Payment to Invoice**: Currently payments are stored but not visually linked; add "Link to Invoice" dropdown in payment form
- **GSTR-1 Summary export to CSV** (in addition to existing JSON export)
- **GSTR-3B Summary export to CSV**
- **RCM Tracker - Mark as Paid feature**: Currently shows RCM purchases but no way to mark tax as paid; add "Mark Paid" toggle per RCM entry
- **Items page - HSN/SAC code lookup hint**: Show common HSN codes in a tooltip near the field
- **Purchases page - ITC Eligible checkbox**: Verify it exists and works (currently in schema but confirm UI has it)
- **Chart of Accounts - edit existing accounts**: Currently can add/delete but not edit account name or type
- **Audit Trail - filter by action type**: Add filter dropdown (Create/Update/Delete) on Audit Trail page
- **Dashboard - compliance health tooltip**: Explain what the % means on hover
- **WorkflowAutomation - "Last Run" timestamp**: Currently shows static "Never", should show actual timestamp after "Run Now" is clicked
- **GSTAPIIntegration - GSTIN validate remembers result**: Show last validation result in a history list (last 5)
- **AI Assistant - suggested questions are clickable chips**: Already exists but verify they submit correctly and scroll to response

### Modify
- **InvoiceForm print button**: Ensure print triggers a proper invoice print (currently `window.print()` prints the whole page not just invoice); implement a `invoice-print-area` div that isolates the invoice for printing; CSS already has `.invoice-print-area` class
- **Dashboard Recent Invoices table**: Add "Type" column badge so user sees what kind of invoice (sales/service/etc)
- **Parties page - Active/Inactive toggle**: Add toggle in edit form for isActive field (currently the badge shows status but form has no toggle)
- **Items page - stock level badge**: Verify the color-coded stock badge exists and is wired to openingStock correctly
- **Tax Rates page**: Ensure all 5 standard GST rates (0%, 5%, 12%, 18%, 28%) + Cess configuration are displayed and that custom rates can be added/deleted
- **GSTR-3B Row component**: The `grid-cols-5` row layout doesn't scroll on mobile; wrap in overflow-x-auto
- **Journal Entries form**: Ensure it supports adding multiple debit/credit lines (compound journal entry) with validation that debits = credits
- **Bank Reconciliation**: Ensure "Auto Match" button works and shows matched/unmatched count summary cards at top
- **CashBook page**: Verify transaction list shows running balance column

### Remove
- Nothing removed

## Implementation Plan

1. **InvoiceForm**: Fix print to use isolated invoice-print-area; ensure print button only prints the invoice card section
2. **InvoiceForm line items**: Verify Cess % column is visible and wired; add item-level HSN code auto-fill from item master
3. **Purchases form**: Verify ITC Eligible checkbox is functional; verify RCM checkbox triggers correct tax accounting
4. **Parties form**: Add isActive toggle in the edit dialog
5. **Tax Rates page**: Audit current implementation; ensure all 5 standard rates shown, custom rate add/delete works
6. **RCM Tracker**: Add "Mark Tax Paid" button per row; track paid status in localStorage
7. **Chart of Accounts**: Add inline edit for account name and type
8. **Audit Trail**: Add action-type filter (All / Create / Update / Delete)
9. **WorkflowAutomation**: Store "last run" timestamp in localStorage; display it per workflow
10. **GSTAPIIntegration**: Add GSTIN validation history (last 5 results) stored in localStorage
11. **GSTR-1**: Add CSV export button alongside existing JSON export
12. **GSTR-3B**: Add CSV export button; wrap GSTR-3B summary table in overflow-x-auto for mobile
13. **Dashboard**: Add tooltip on compliance % card; verify Recent Invoices table shows Type badge
14. **CashBook**: Verify/add running balance column to transaction list
15. **Bank Reconciliation**: Verify summary cards (matched/unmatched) at top; ensure Auto Match works correctly
16. **Journal Entries**: Verify debit=credit validation before save; ensure compound entries work
17. **AI Assistant**: Verify suggested question chips click and submit correctly
18. **Validate**: Run typecheck, lint, build -- fix all errors
