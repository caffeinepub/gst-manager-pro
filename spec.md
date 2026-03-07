# GST Manager Pro

## Current State
Full-stack GST Management app with: Dashboard, Masters (Business Profile, Parties, Items, Tax Rates), Invoicing (8 types), Payments, Accounting (Purchases, Journal, Bank, CashBook), GST Compliance (GSTR-1, GSTR-3B, ITC, RCM, Audit Trail), Reports (7 types), AI Tax Assistant. Build passes cleanly. Previous audit round fixed: real CSV exports, P&L invoice type filter, purchase draft status, cancel invoice button, linked invoice for credit/debit notes, totals rows, print CSS.

## Requested Changes (Diff)

### Add
- **Inventory / Stock Summary report** page (`reports-stock`) -- shows all items with opening stock, sales qty consumed, purchases qty, closing stock estimate, value
- **Cash Flow Statement** report page (`reports-cashflow`) -- shows operating/investing/financing activities from invoices, purchases, bank transactions
- **Bank Reconciliation** page (`accounting-reconciliation`) -- compare bank transactions vs invoices/payments, mark reconciled, show unmatched items
- **Workflow notifications panel** on Dashboard -- overdue invoices alert, GST filing reminders, pending payments
- **Enhanced AI Assistant** -- add 15+ more GST Q&A entries covering: TDS on GST, composition levy, export invoices, SEZ supplies, blocked ITC Section 17(5), GST on advance receipt, annual aggregate turnover, place of supply rules, letter of undertaking (LUT), GST registration threshold, nil returns, GSTR-2B matching, penalties and late fees, GST audit, GST on imports
- **Inventory ERP badge** on Items page -- show current stock level (opening stock - sold + purchased) per item
- Sidebar nav entries for new pages
- AppPage type entries for new pages

### Modify
- `AppPage` type in `src/frontend/src/types/gst.ts` -- add `reports-stock`, `reports-cashflow`, `accounting-reconciliation`
- `App.tsx` -- add routing for 3 new pages
- `AppSidebar.tsx` -- add nav items for new pages (Stock Summary under Reports, Cash Flow under Reports, Bank Reconciliation under Accounting)
- `Dashboard.tsx` -- add Workflow Alerts card (overdue invoices, upcoming GST deadlines with days countdown)
- `Items.tsx` -- add computed stock column in table

### Remove
- Nothing

## Implementation Plan
1. Add new AppPage entries to types/gst.ts
2. Create `src/frontend/src/pages/Reports/StockSummary.tsx`
3. Create `src/frontend/src/pages/Reports/CashFlow.tsx`
4. Create `src/frontend/src/pages/Accounting/BankReconciliation.tsx`
5. Update App.tsx to route the 3 new pages
6. Update AppSidebar.tsx to add nav items
7. Update Dashboard.tsx to add Workflow Alerts card
8. Update Items.tsx to show computed stock
9. Enhance AIAssistant.tsx with 15 more Q&A entries
10. Validate build
