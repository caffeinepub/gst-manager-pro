# GST Manager Pro

## Current State
Version 54 is live with:
- Full GST compliance (GSTR-1, GSTR-3B, e-Invoice, e-Way Bill, ITC Reconciliation, RCM)
- Payroll system (Employees, Attendance, Process Payroll, Payslips, Statutory Compliance)
- Multi-business support with per-business branding
- ICP backend database (generic entity storage per user principal)
- Internet Identity authentication
- OCR Capture, Data Import, Automated UAT
- API Config has SMS/Email config but NO WhatsApp section and NO test button for SMS
- BackupRestore reads from localStorage (not ICP canister) for local backup
- No Communication module anywhere (no page, no route, no nav, no send buttons on invoices)

## Requested Changes (Diff)

### Add
- `CommunicationHub` page: send invoices/payslips/reminders via Email, SMS, WhatsApp
  - Send Invoice: pick invoice → compose message → send via Email/SMS/WhatsApp
  - Send Payslip: pick employee + month → send via Email/SMS/WhatsApp
  - Payment Reminders: list overdue invoices → send bulk reminder via Email/SMS/WhatsApp
  - Communication Logs: history of sent messages with status
- WhatsApp Business API config card in APIConfig.tsx (Meta/Twilio/WATI providers)
- Test Connection buttons for SMS and Email in APIConfig.tsx
- `whatsapp` key added to `ApiSettings` type in gst.ts
- `communication` AppPage added to AppPage union type in gst.ts
- Communication route in App.tsx
- Communication nav item in AppSidebar (under Settings or standalone)
- Communication tab in BottomNav (or at least in sidebar)
- "Send" action buttons on InvoiceList (per-invoice actions: Send via Email/SMS/WhatsApp)

### Modify
- `ApiSettings` type: add `whatsapp` provider config
- `AppPage` type: add `"communication"` 
- `APIConfig.tsx`: add WhatsApp config card + test connection for SMS/Email
- `BackupRestore.tsx`: fix local backup to export from ICP canister getAllEntityRecords, not just localStorage
- `InvoiceList.tsx`: add Send action button per invoice
- `AppSidebar.tsx`: add Communication nav item
- `BottomNav.tsx`: add Communication tab

### Remove
- Nothing removed

## Implementation Plan
1. Update `types/gst.ts` — add `whatsapp` to ApiSettings, add `"communication"` to AppPage
2. Update `APIConfig.tsx` — add WhatsApp config card, add test connection for SMS/Email
3. Update `BackupRestore.tsx` — backend-aware export using getAllEntityRecords
4. Create `CommunicationHub.tsx` — full send flows (Email/SMS/WhatsApp) with logs
5. Update `App.tsx` — add communication route case
6. Update `AppSidebar.tsx` — add Communication nav item
7. Update `BottomNav.tsx` — add Communication tab
8. Update `InvoiceList.tsx` — add send action button per invoice
