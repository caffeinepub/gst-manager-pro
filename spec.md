# GST Manager Pro — Best Practices, Industry Standards & Compliance Overhaul

## Current State
Version 44 of GST Manager Pro has all major modules built: Masters, Invoicing, Accounting, GST Compliance (GSTR-1, GSTR-3B, ITC, RCM), Reporting, Payroll (Employees, Attendance, ProcessPayroll, StatutoryCompliance), and Settings (OCR, Import, UAT, API Config). A full audit against Indian GST law (CGST Act 2017 + Rules) and Payroll statutory law (EPF Act, ESI Act, Income Tax Act Section 192, State PT Acts) has identified 40+ critical compliance gaps and calculation errors.

## Requested Changes (Diff)

### Add

**Payroll**
- TDS Section 192: correct slab rates for both Old Regime (nil/5%/20%/30%) and New Regime (nil/5%/10%/15%/20%/30%) with Finance Act 2023 slabs. Per-employee tax regime toggle (`old` / `new`).
- HRA exemption calculation under Section 10(13A): min(actual HRA, 50%/40% of basic depending on metro/non-metro, actual rent paid - 10% of basic).
- 80C deduction in TDS projection: employee PF contribution + Form 12BB declared investments (up to ₹1.5L).
- PF ceiling enforcement: cap Basic+DA at ₹15,000 for PF computation.
- Employer PF split: EPF (3.67%) + EPS (8.33%, capped ₹1,250/month) + EDLI (0.5%, capped ₹75/employee) + Admin charges (0.5%).
- ESI logic fix: apply only when gross ≤ ₹21,000 (not OR logic).
- State-wise PT slabs for 10 major states: Maharashtra, Karnataka, Tamil Nadu, West Bengal, Andhra Pradesh, Telangana, Gujarat, Kerala, MP, Delhi (nil).
- Labour Welfare Fund (LWF) field and deduction.
- Employee statutory fields: UAN, ESIC IP Number, Aadhaar (masked), PF Account Number.
- Payroll journal entry fix: add PT Payable Cr (2303) and TDS Payable Cr (2201) to balance the entry.
- EDLI cap fix: apply ₹75/employee cap per individual, not on total wages.

**GSTR-1**
- B2CL section (Table 5): invoice-level reporting for unregistered buyer invoices > ₹2.5 lakh.
- CDNUR section (Table 9B): credit/debit notes issued to unregistered buyers.
- Nil/Exempt/Zero-rated supply table (Table 8).
- Export invoices section (Table 6A): EXPWP / EXPWOP flags.
- B2CS `sply_ty`: correctly set to `INTER` for interstate B2C and `INTRA` for intrastate.
- B2B `rchrg` flag: read from actual invoice RCM flag instead of hardcoded `N`.
- Business GSTIN populated from Business Profile in all JSON exports.
- HSN mandatory digit warning: flag HSN codes with fewer than 4 digits.

**GSTR-3B**
- Table 3.1 sub-rows (b) zero-rated, (c) nil-rated/exempt, (d) non-GST — populated from invoice data.
- Table 3.2: place-of-supply-wise inter-state supply breakup.
- Table 4 sub-sections: ITC available by source (imports, RCM, ISD, others), ITC reversed (17(5) blocked), net ITC.
- RCM ITC credit-back: once RCM is marked paid, add to eligible ITC pool.
- GSTR-3B JSON export: use official GSTN schema (`ret_period`, `gstin`, `sup_details`, `itc_elg`, `inward_sup`).
- CSV export fix: populate RCM IGST from computed value instead of hardcoded `"0.00"`.

**Invoice / Purchase Types**
- `isReverseCharge` boolean on Invoice (Rule 46(k)).
- `authorizedSignatory` field on Invoice (Rule 46(p)).
- `dispatchFromAddress` / `shipToAddress` fields (Rule 46(e)).
- `taxRegime` on Employee type.
- `hraExemptionCity` (metro/non-metro) on Employee.
- `uan`, `esicNumber`, `aadhaarNumber`, `pfAccountNumber` on Employee.
- `lwfApplicable`, `lwfAmount` on Employee.
- `paymentDate` on Purchase (for Rule 37 tracking).
- `itcCategory` on Purchase (inputs / input services / capital goods).
- `placeOfSupply` on Purchase.

**ITC Reconciliation**
- Section 17(5) blocked credit category dropdown with the 14 notified categories.
- Rule 37 (180-day reversal) tracker: flag purchases where payment date is >180 days past or missing.

**RCM Tracker**
- IGST column and totals for interstate RCM.
- Section 9(3) notified category reference list (GTA, legal services, director remuneration, etc.).
- Mark Paid: post journal entry (RCM Tax Payable Dr / Bank Cr) and credit RCM ITC in GSTR-3B.

**StatutoryCompliance**
- Form 16 Part A/B data display (annual TDS summary per employee).
- Form 24Q quarterly TDS return data.
- EPF ECR format description and download.
- New vs Old regime TDS calculation display.

### Modify
- `ProcessPayroll.tsx`: all calculation fixes (PF ceiling, EPF/EPS/EDLI split, ESI logic, TDS slabs, PT state-wise, LOP, journal entry balance).
- `StatutoryCompliance.tsx`: EDLI per-employee cap, TDS slab display, add Form 16 data.
- `GSTR1.tsx`: add B2CL, CDNUR, nil/exempt, export sections; fix sply_ty, rchrg, business GSTIN.
- `GSTR3B.tsx`: add Table 3.2, full Table 4, fix JSON export schema, fix CSV IGST RCM.
- `ITCReconciliation.tsx`: Section 17(5) categories, Rule 37 tracker.
- `RCMTracker.tsx`: IGST totals, Section 9(3) list, Mark Paid journal + ITC.
- `gst.ts` types: add missing fields to Invoice, Purchase, Employee.
- `InvoiceForm.tsx`: add isReverseCharge, authorizedSignatory, dispatchAddress fields.

### Remove
- Random 64-char hex IRN generation — replace with clear "Simulation Only" label + correct SHA-256 structure description.
- Hardcoded `"0.00"` for RCM IGST in GSTR-3B CSV export.
- Synthetic GSTR-2B portal data in ITCReconciliation (or clearly label it as mock data).

## Implementation Plan

1. Update `gst.ts` types with all missing fields (Invoice, Purchase, Employee).
2. Fix `ProcessPayroll.tsx` — PF ceiling, EPF/EPS/EDLI split, ESI logic, TDS correct slabs (old/new regime), HRA exemption, 80C, PT state-wise, journal entry balance.
3. Fix `StatutoryCompliance.tsx` — EDLI cap, Form 16 data display, tax regime selector.
4. Fix `GSTR1.tsx` — B2CL, CDNUR, nil/exempt, export tables, sply_ty, rchrg, business GSTIN.
5. Fix `GSTR3B.tsx` — Table 3.1 sub-rows, Table 3.2, Table 4 full, JSON schema, CSV RCM IGST.
6. Fix `RCMTracker.tsx` — IGST totals, Section 9(3) list, Mark Paid journal entry + ITC feedback.
7. Fix `ITCReconciliation.tsx` — Section 17(5) categories, Rule 37 tracker.
8. Fix `InvoiceForm.tsx` — isReverseCharge, authorizedSignatory, dispatchAddress.
9. Validate and deploy.
