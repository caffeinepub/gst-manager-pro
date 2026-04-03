# GST Manager Pro — Payroll Module

## Current State
GST Manager Pro is a full-stack GST compliance and accounting app for SMEs. It has:
- Masters (Business Profile, Parties, Items, Tax Rates)
- Invoicing (Sales, Purchase, Credit/Debit Notes, e-Invoice, e-Way Bill, etc.)
- Accounting (CashBook, Journal Entries, Bank Reconciliation, Chart of Accounts)
- GST Compliance (GSTR-1, GSTR-3B, ITC, RCM, Audit Trail)
- Reporting (P&L, Balance Sheet, Trial Balance, Stock Summary, Cash Flow)
- Settings (API Config, OCR Capture, Data Import, Backup/Restore, UAT Dashboard)
- All data persisted in localStorage with real-time cloud sync
- AppPage type union in `src/frontend/src/types/gst.ts` controls navigation
- AppSidebar and BottomNav drive navigation
- useGSTStore.ts provides all CRUD hooks

No Payroll module exists yet.

## Requested Changes (Diff)

### Add
- **Payroll types** in `types/gst.ts`: Employee, AttendanceRecord, LeaveBalance, PayrollRun, Payslip
- **Payroll AppPage entries**: payroll-employees, payroll-attendance, payroll-process, payroll-payslips, payroll-reports, payroll-statutory
- **usePayrollStore hook** in `hooks/useGSTStore.ts` for employees, attendance, payroll runs
- **6 Payroll pages**:
  - `pages/Payroll/Employees.tsx` — Add/Edit/Delete employees (salaried + daily-wage), salary structure, bank details
  - `pages/Payroll/Attendance.tsx` — Monthly attendance entry grid (present/absent/half-day), leave types (CL/SL/EL), LOP calculation
  - `pages/Payroll/ProcessPayroll.tsx` — Monthly payroll run, auto-calculate gross/deductions/net pay, approval workflow
  - `pages/Payroll/Payslips.tsx` — View/download PDF payslips per employee per month with business branding
  - `pages/Payroll/PayrollReports.tsx` — Salary register, PF/ESI summary, TDS summary, CTC report; CSV/Excel/PDF export
  - `pages/Payroll/StatutoryCompliance.tsx` — PF/ESI challan generation, PT slabs, TDS Section 192 projection
- **Accounting integration**: salary payment auto-posts JournalEntry (Salary Expense Dr / Bank Cr) and CashBook entry
- **Sidebar entry**: new "Payroll" collapsible group between Inventory and GST Compliance
- **BottomNav**: add "Payroll" nav item with matchPrefix "payroll"
- **App.tsx**: add all 6 payroll page case entries

### Modify
- `src/frontend/src/types/gst.ts` — add payroll types and AppPage values
- `src/frontend/src/hooks/useGSTStore.ts` — add usePayrollStore, useAttendance, usePayrollRuns hooks
- `src/frontend/src/App.tsx` — import and route payroll pages
- `src/frontend/src/components/Layout/AppSidebar.tsx` — add Payroll nav group
- `src/frontend/src/components/Layout/BottomNav.tsx` — add Payroll bottom nav item

### Remove
- Nothing removed

## Implementation Plan

1. Extend `types/gst.ts` with Employee, AttendanceRecord, LeaveBalance, PayrollRun, Payslip types and 6 new AppPage values
2. Add payroll CRUD hooks to `useGSTStore.ts`
3. Build 6 payroll page components:
   - Employees: full CRUD, salaried/daily-wage toggle, salary structure (Basic, HRA, DA, allowances, deductions), PF/ESI/PT/TDS flags, bank details
   - Attendance: monthly grid per employee (P/A/H), LOP auto-calc, leave balance tracking
   - ProcessPayroll: month selector, payroll run generation for all active employees, gross/deductions breakdown, approve/finalize, auto-post journal entry
   - Payslips: list of finalized payslips, per-employee monthly PDF download with branding
   - PayrollReports: salary register table, PF/ESI summary, TDS summary, CTC report, export in CSV/Excel/PDF
   - StatutoryCompliance: PF 12%+12%, ESI 0.75%+3.25% (≤21000), PT state slabs, TDS Section 192 annual projection, challan PDF download
4. Wire Payroll section into AppSidebar navItems
5. Add Payroll bottom nav item
6. Add all page cases to App.tsx PageContent switch
7. Validate (lint + typecheck + build)
