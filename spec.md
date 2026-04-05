# GST Manager Pro

## Current State

GST Manager Pro is a full-featured GST compliance and payroll application. The app currently uses FY 2025-26 (AY 2025-26) tax slabs and validation standards throughout:

- **ProcessPayroll.tsx**: `calculateTDS()` uses old New Regime slabs (₹3L nil threshold, 5/10/15/20/25/30% bands, 87A rebate nil if income ≤ ₹7L). Labels say "FY 2025-26".
- **StatutoryCompliance.tsx**: Duplicate `calculateTDS()` with same outdated slabs. TDS summary display labels "FY 2025-26".
- **GSTR1.tsx**: `fp` field computed as `${month}${year}` dynamically — no FY-specific label, but HSN digit warning only checks for < 4 digits (no differentiation between >₹5Cr turnover needing 6 digits).
- **InvoiceForm.tsx**: No FY reset warning for invoice series restart on 1 April 2026.
- **GSTR3B.tsx**: `ret_period` dynamically computed from date range — no FY-specific issues.

## Requested Changes (Diff)

### Add
- FY 2026-27 invoice series reset banner: warn users when creating/editing invoices in FY 2026-27 (on or after 1 April 2026) that invoice numbering should restart from the beginning of the series per Rule 46. Show a dismissible banner at the top of InvoiceForm when the current date is on/after 1 Apr 2026 and the invoice date is in FY 2026-27.
- HSN 6-digit enforcement: in GSTR1 HSN summary, add a second-level warning for HSN codes < 6 digits when the business turnover exceeds ₹5 Crore (read turnover from businessProfile if available, otherwise show both warnings side by side). Existing < 4-digit warning unchanged.

### Modify
- **ProcessPayroll.tsx** `calculateTDS()`: Update New Regime slabs to FY 2026-27 (AY 2026-27) as per Finance Act 2025:
  - Nil: ≤ ₹4,00,000 (was ₹3,00,000)
  - 5%: ₹4,00,001 – ₹8,00,000
  - 10%: ₹8,00,001 – ₹12,00,000
  - 15%: ₹12,00,001 – ₹16,00,000
  - 20%: ₹16,00,001 – ₹20,00,000
  - 25%: ₹20,00,001 – ₹24,00,000
  - 30%: above ₹24,00,000
  - 87A rebate: nil tax if taxable income ≤ ₹12,00,000 (rebate up to ₹60,000) — was ₹7L
  - Standard deduction under new regime: ₹75,000 (was ₹50,000) — pass 75000 instead of 50000 when calling with new regime
  - Old Regime: unchanged (₹2.5L nil, 5%/20%/30%, 87A rebate ≤ ₹5L)
  - Update comment label from "FY 2025-26" to "FY 2026-27 (AY 2026-27)"
- **StatutoryCompliance.tsx** `calculateTDS()`: Apply identical FY 2026-27 new regime slab changes. Update all display labels from "FY 2025-26" to "FY 2026-27". Update the slab reference table shown in the UI to reflect new bands.
- **StatutoryCompliance.tsx** TDS summary panel: Update the informational text ("Section 192 TDS — FY 2025-26 Slab Rates") to say "FY 2026-27 (AY 2026-27)" and display the new correct slab rates.
- **GSTR1.tsx** HSN digit warning: Enhance the warning for `shortDigit` — if HSN digits < 4 show red "Min. 4 digits required"; also flag when digits < 6 and turnover > ₹5Cr with an amber warning "6 digits required for turnover > ₹5Cr".

### Remove
- Nothing removed.

## Implementation Plan

1. **ProcessPayroll.tsx**
   - Update `calculateTDS()` new regime branch: change nil threshold from 300000 to 400000; update all bracket boundaries (800000, 1200000, 1600000, 2000000, 2400000); update 87A rebate threshold from 700000 to 1200000
   - Where `calculateTDS(taxableAnnual, regime, 50000)` is called: pass 75000 as stdDeduction when regime === "new" (new standard deduction for FY 2026-27), keep 50000 for old regime
   - Update comment header label

2. **StatutoryCompliance.tsx**
   - Same `calculateTDS()` function changes as ProcessPayroll
   - Same stdDeduction pass-through change
   - Update the UI text panel that shows slab reference rates to display FY 2026-27 bands
   - Update section heading label

3. **InvoiceForm.tsx**
   - Add a dismissible alert banner at the top of the form: if `new Date() >= new Date('2026-04-01')` and the invoice date is in FY 2026-27 (April 2026 or later), show: "FY 2026-27 started — please ensure your invoice series has restarted from the beginning as required by Rule 46 of CGST Rules."
   - Use localStorage key `fy2627_invoice_reset_dismissed` to remember dismissal

4. **GSTR1.tsx**
   - In the HSN summary table, read `businessProfile.annualTurnover` (or a reasonable fallback)
   - Enhance per-row warning logic: shortDigit (< 4) = red warning; mediumDigit (< 6 and turnover > 50000000) = amber warning
   - Keep existing `shortDigit` boolean, add `mediumDigit` boolean to hsnMap entries
