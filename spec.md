# GST Manager Pro

## Current State

- Payroll module is fully implemented with: Employees, Attendance, Process Payroll, Payslips, Reports (Salary Register, PF/ESI, TDS, CTC), and Statutory Compliance pages.
- Employee records include a `pan` field (string) but no `panVerified`, `panVerifiedName`, `panVerifiedAt`, or `panType` fields.
- GSTIN/PAN Verification is implemented under GST Compliance > GSTINPANVerification.tsx, using `gstVerificationService.ts` which exports `verifyPAN()` and the `PANVerificationResult` interface. The service calls the Income Tax e-Filing API with graceful fallback to format-only validation.
- AppPage type includes `payroll-employees` through `payroll-statutory` but no `payroll-pan-verification` page.
- Payslips render PAN on the payslip HTML but no verified badge.
- PayrollReports TDS Summary shows PAN column but no verified badge.
- Employees list table has no PAN verified status column.

## Requested Changes (Diff)

### Add
1. **`panVerified` fields on Employee type** in `src/frontend/src/types/gst.ts`:
   - `panVerified?: boolean`
   - `panVerifiedName?: string`
   - `panVerifiedAt?: string` (ISO timestamp)
   - `panType?: string`

2. **Inline PAN verification in Add/Edit Employee dialog** (`Employees.tsx`):
   - Next to the PAN input field, add a "Verify" button that calls `verifyPAN()` from `gstVerificationService.ts`
   - Show loading spinner while verifying
   - On success: auto-fill employee name if name field is empty or matches; store `panVerified: true`, `panVerifiedName`, `panVerifiedAt`, `panType` on the form state
   - On failure/format-only: show error message inline, do not set panVerified
   - Show a green "PAN Verified" badge next to PAN field when panVerified is true on the form
   - If API key not configured, show a small amber note inline (same pattern as GSTINPANVerification.tsx)

3. **"PAN Verified" badge on Employees list table**:
   - Add a "PAN" column to the employees table showing either a green "Verified" badge (ShieldCheck icon) or the raw PAN string with no badge
   - The badge should be compact (text-xs)

4. **New standalone page: `PayrollPANVerification.tsx`** at `src/frontend/src/pages/Payroll/PayrollPANVerification.tsx`:
   - Lists all employees with their PAN numbers in a table: Name, Emp Code, PAN, PAN Type, Verification Status, Last Verified, Actions
   - Per-row "Verify" button that calls `verifyPAN()` and updates the employee record via `updateEmployee()`
   - "Verify All" button at the top that runs verification sequentially for all employees with a PAN, with a progress indicator
   - Verified employees show green "PAN Verified" badge with timestamp; unverified show "Not Verified" in muted text
   - Auto-fills employee name if verified name differs (shows a confirmation prompt/toast)
   - Uses the same `verifyPAN` service and API key awareness as existing GSTINPANVerification

5. **"PAN Verified" badge on Payslips PDF**:
   - In `Payslips.tsx`, update the `printPayslip` HTML generation to show "✓ PAN Verified" next to the PAN field if `emp.panVerified` is true

6. **"PAN Verified" badge in PayrollReports TDS Summary**:
   - In `PayrollReports.tsx`, add a small "Verified" badge icon next to PAN in the TDS Summary table when `emp.panVerified` is true

7. **AppPage type update** in `types/gst.ts`:
   - Add `"payroll-pan-verification"` to AppPage union

8. **Navigation**: Add the new page to the Payroll section routing in `AppLayout.tsx` or wherever payroll page routing happens.

### Modify
- `src/frontend/src/types/gst.ts`: Add `panVerified?`, `panVerifiedName?`, `panVerifiedAt?`, `panType?` to `Employee` interface; add `"payroll-pan-verification"` to `AppPage`
- `src/frontend/src/pages/Payroll/Employees.tsx`: Add inline PAN verify button, PAN verified badge in form and table
- `src/frontend/src/pages/Payroll/Payslips.tsx`: Add PAN Verified indicator to payslip HTML
- `src/frontend/src/pages/Payroll/PayrollReports.tsx`: Add PAN Verified badge to TDS Summary table
- App routing file (AppLayout.tsx or equivalent): Register `payroll-pan-verification` page and add nav link under Payroll section

### Remove
- Nothing removed

## Implementation Plan

1. Update `Employee` interface in `types/gst.ts` to add panVerified fields; add `payroll-pan-verification` to AppPage.
2. Update `Employees.tsx`:
   - Add inline Verify button next to PAN input in Add/Edit dialog
   - Wire to `verifyPAN()`, handle loading/success/error states
   - Auto-fill name on success
   - Show PAN Verified badge in dialog and in the table row
3. Create `PayrollPANVerification.tsx` standalone page with employee list, per-row verify, and Verify All.
4. Update `Payslips.tsx` to show PAN Verified text in payslip HTML.
5. Update `PayrollReports.tsx` TDS Summary to show PAN Verified badge.
6. Wire new page into app routing/navigation.
