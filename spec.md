# GST Manager Pro

## Current State

The project has a substantial frontend-only React/TypeScript application with the following modules already built:
- Masters: BusinessProfile, Parties (Customer/Vendor), Items, TaxRates
- Invoicing: InvoiceForm (9 types), InvoiceList, Payments
- Accounting: Purchases, JournalEntries, BankAccounts, CashBook, BankReconciliation, ChartOfAccounts
- GST Compliance: GSTR1, GSTR3B, ITCReconciliation, RCMTracker, AuditTrail, GSTAPIIntegration, WorkflowAutomation
- Reports: Reports (Balance Sheet, P&L, Trial Balance), CashFlow, StockSummary
- Inventory: InventoryERP
- AI: AIAssistant
- Settings: BackupRestore
- Dashboard

Data persistence: useGSTStore (localStorage via useLocalStorage). Backend exists with basic cloud backup via blob-storage.

Issues identified:
- Business Profile save may fail with strict GSTIN validation
- API integrations are simulated, no real API key management UI
- PDF export not implemented (only print dialog)
- Excel export not implemented (only CSV)
- Cloud backup is partial; no full restore flow
- Several modules missing complete CRUD (view/edit/delete)
- No real API settings page for GSTN, PAN/GSTIN, Banking, Email/SMS keys
- Mobile responsiveness gaps in complex tables
- Invoice form missing some invoice types' specific fields
- GST auto-calculation rules engine needs verification
- Audit trail not logging all actions

## Requested Changes (Diff)

### Add
- Real API Settings page: GSTN API, PAN/GSTIN Validation, Banking API, Email/SMS Gateway (store keys in localStorage + backend)
- PDF download for all invoices and financial reports (using browser print-to-PDF + jsPDF approach)
- Excel export (XLSX) for all reports and data grids alongside existing CSV/JSON
- Complete CRUD (Add/View/Edit/Delete/Print) for ALL modules
- Full cloud backup/restore: serialize all localStorage stores to JSON, upload to backend blob storage, list and restore snapshots
- Delivery Challan invoice type with full form fields
- Payment Tracking improvements: link payments to multiple invoices, aging view
- GSTR-1 full B2B/B2C/CDNR/HSN/DOC summary sections
- GSTR-3B complete table 3.1 to 5 with auto-population from invoice data
- ITC Reconciliation: GSTR-2B mock data import + match/mismatch display
- Inventory ERP: stock adjustments, purchase order integration
- Workflow Automation: all 8 workflows with toggle, run, and last-run timestamp
- Voice-assisted invoicing (Web Speech API)
- Multi-language EN/HI toggle persisted in settings
- AI Tax Assistant with 30+ Q&A and free-text search
- OCR invoice capture UI (file upload + field extraction simulation)
- Predictive cash flow chart (6-month forecast)
- Anomaly detection alerts on dashboard
- Compliance health score on dashboard
- Auto-reminders panel for GST filing due dates
- Mobile bottom navigation for key sections
- Proper data-ocid markers on all interactive elements

### Modify
- BusinessProfile: relax GSTIN validation (only name required), persist all fields including digital signature upload
- InvoiceForm: fix GST auto-calculation (CGST+SGST for intra-state, IGST for inter-state), ensure all 9 types render correct fields, fix double-increment bug, add PDF print layout
- useGSTStore: ensure all entities (invoices, parties, items, purchases, journals, bank txns, payments) persist and load correctly from localStorage
- AuditTrail: log every create/update/delete action across all modules with timestamp, user, module, action, entity ID
- Reports: fix Balance Sheet bank balance; add PDF and Excel export to all reports
- BackupRestore: full implementation -- serialize all store data, upload to backend, list snapshots with dates, restore selected snapshot
- AppSidebar: fix mobile collapse behavior, ensure all new pages are linked
- Dashboard: real KPIs from store data (not hardcoded), GST due dates, compliance health, anomaly alerts
- GSTAPIIntegration: replace simulated calls with real HTTP fetch using user-configured API keys from Settings

### Remove
- Hardcoded/mock data from dashboard KPI cards (replace with live store data)
- Duplicate sidebar menu items if any

## Implementation Plan

1. **useGSTStore audit**: verify all entities have full CRUD actions, localStorage keys are consistent, no data loss on refresh
2. **types/gst.ts audit**: ensure all entity types are complete and consistent across modules
3. **BusinessProfile fix**: relax validation, add digital signature upload field, persist cleanly
4. **InvoiceForm audit**: verify all 9 invoice types, fix GST calculation engine, add PDF export, fix counter bug
5. **Parties/Items/TaxRates**: ensure Add/Edit/Delete/View all work with store
6. **Purchases**: full CRUD + RCM flag + PDF
7. **JournalEntries**: debit=credit enforcement, Add/View/Edit/Delete
8. **Banking/CashBook/BankReconciliation**: full CRUD, running balance, auto-match
9. **ChartOfAccounts**: 27 Indian GAAP accounts, editable, add/delete custom accounts
10. **GSTR1**: auto-populate from invoice store, B2B/B2C/CDNR/HSN sections, JSON/CSV/Excel export
11. **GSTR3B**: auto-populate liabilities and ITC from store, all 5 tables, export
12. **ITCReconciliation**: GSTR-2B import, match/mismatch logic
13. **RCMTracker**: filter RCM purchases, payment tracking
14. **AuditTrail**: hook into all store mutations
15. **Reports**: fix all calculations, add PDF+Excel export
16. **Dashboard**: live KPIs, compliance score, anomaly alerts, due dates
17. **InventoryERP**: stock levels, adjustments, low-stock alerts
18. **AI Assistant**: 30+ Q&A, free-text search
19. **WorkflowAutomation**: 8 workflows with real toggle/run
20. **GSTAPIIntegration + API Settings page**: real API key config, HTTP outcall integration
21. **BackupRestore**: full cloud snapshot upload/restore via backend
22. **OCR page**: file upload, field extraction simulation
23. **PDF export utility**: shared jsPDF/html2canvas utility
24. **Excel export utility**: shared xlsx utility
25. **Mobile responsiveness**: bottom nav, responsive tables, collapsible sidebar
26. **data-ocid markers**: all interactive elements
