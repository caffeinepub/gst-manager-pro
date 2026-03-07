# GST Manager Pro

## Current State
A full-stack GST Management Application with:
- Dashboard with KPI cards, workflow alerts, compliance health, recent invoices
- Masters: Business Profile (GSTIN validation), Parties (customer/vendor), Items/Services (HSN/SAC), Tax Rates
- Invoicing: 8 invoice types (sales, service, quotation, proforma, credit note, debit note, bill of supply, delivery challan), payments
- Accounting: Purchases with RCM/ITC, Journal Entries, Bank Accounts, Cash Book, Bank Reconciliation
- GST Compliance: GSTR-1 (B2B/B2C/CDN), GSTR-3B (auto-calc), ITC Reconciliation (eligible/blocked), RCM Tracker, Audit Trail
- Reports: Sales Register, Purchase Register, GST Summary, AR/AP Ageing, Trial Balance, P&L, Balance Sheet, Stock Summary, Cash Flow
- AI Tax Assistant with 26 Q&A entries

## Requested Changes (Diff)

### Add
- Chart of Accounts page (in sidebar under Accounting) - fully interactive, pre-populated with Indian GAAP accounts, add/edit/delete custom accounts
- Inventory ERP page - stock movement tracking, opening/closing stock, goods receipt, goods issue log, stock value
- e-Invoice IRN generation button in invoice form - simulate IRN generation with random hash, show QR code simulation
- e-Way Bill auto-generate button in invoice form - simulate e-Way Bill number generation for eligible invoices
- GSTR-2B tab inside ITC Reconciliation - portal data simulation for vendor invoice matching
- GSTR-1 auto-filing workflow - "File GSTR-1" button with status tracking (draft → filed → acknowledged)
- GSTR-3B auto-generation with submit workflow - "Generate & File GSTR-3B" button with status tracking
- Document OCR upload in Purchases page - file upload button that "scans" and auto-fills purchase fields
- Workflow Automation panel (Notifications) - accessible from header bell icon showing pending reminders and due date alerts
- AppPage types for new pages: `accounting-chart-of-accounts`, `inventory-erp`
- Sidebar nav items for new pages

### Modify
- InvoiceForm: add "Generate IRN" and "Generate e-Way Bill" action buttons next to the IRN/eWayBill fields
- GSTR-1: add "File GSTR-1" button that tracks filing status per period
- GSTR-3B: add "Generate & File GSTR-3B" button with status tracking
- ITC Reconciliation: add GSTR-2B tab with simulated portal data matching
- Purchases: add OCR upload button for scanning vendor bills
- AppSidebar: add Chart of Accounts under Accounting, add Inventory ERP as a top-level section
- App.tsx: wire new page routes
- gst.ts types: add new AppPage values

### Remove
- Nothing removed

## Implementation Plan
1. Add new AppPage types in gst.ts
2. Create ChartOfAccounts page component
3. Create InventoryERP page component
4. Enhance InvoiceForm with IRN/eWayBill generation buttons
5. Enhance GSTR1 with auto-filing workflow
6. Enhance GSTR3B with submit workflow
7. Enhance ITCReconciliation with GSTR-2B tab
8. Add OCR upload to Purchases
9. Add WorkflowNotifications bell panel to Header
10. Wire sidebar and App.tsx for new pages
11. Validate and deploy
