# GST Manager Pro

## Current State

- **Import Data** (`DataImport.tsx`): Had `sales_invoices` and `purchases` only. Service Invoice, Proforma Invoice, Credit Note, Debit Note were absent from TEMPLATES, MODULES, duplicate detectors, and importRow logic. Fix already applied in this session.
- **GSTAPIIntegration.tsx**: GSTIN and PAN validation already use real direct API calls via `gstVerificationService.ts`. e-Invoice IRN, e-Way Bill, GSTN Return Fetch, and Bank Sync all use `simulateApi` (a `setTimeout` fake), showing "Simulated" badges. No real HTTP calls made.
- **APIConfig.tsx**: Has config sections for GSTN, PAN, Banking (generic), and SMS. No dedicated sections for e-Invoice IRP endpoint, e-Way Bill NIC endpoint, GSTN Return API, or RBI Account Aggregator.
- **ApiSettings type** (`types/gst.ts`): Has `gstn`, `pan`, `banking`, `sms` only. Missing `einvoice`, `ewaybill`, `gstnReturn`, `accountAggregator` sections.

## Requested Changes (Diff)

### Add
- `einvoice` config block in `ApiSettings`: `url`, `key`, `clientId`, `clientSecret`, `enabled`, `sandboxMode`
- `ewaybill` config block in `ApiSettings`: `url`, `key`, `username`, `enabled`, `sandboxMode`
- `gstnReturn` config block in `ApiSettings`: `url`, `key`, `clientId`, `enabled`
- `accountAggregator` config block in `ApiSettings`: `url`, `clientId`, `clientSecret`, `redirectUri`, `enabled`, `sandboxMode`
- Config cards in `APIConfig.tsx` for each of the 4 new blocks with masked inputs, test connection buttons, endpoint info, and sandbox toggles
- Real `fetch()` handler `handleEInvoice` in `GSTAPIIntegration.tsx` — POSTs to user-configured IRP endpoint with IRN generation payload
- Real `fetch()` handler `handleEWayBill` — POSTs to user-configured NIC e-Way Bill endpoint
- Real `fetch()` handler `handleGSTRFetch` — GETs from user-configured GSTN returns endpoint
- Real `fetch()` handler `handleBankSync` — initiates RBI Account Aggregator OAuth flow (redirect or popup), fetches FI data on return, shows balance + recent transactions
- CORS-blocked error handling for all 4 (same graceful degradation pattern as GSTIN/PAN)
- "Direct API" badge replacing "Simulated" badge on all 4 cards; badge goes green "Live ✓" on success
- Remove "Demo / Simulation Mode" disclaimer banner (or update it to reflect that all APIs are now direct)

### Modify
- `ApiSettings` interface — extend with 4 new blocks
- `DEFAULT_SETTINGS` in `APIConfig.tsx` — add defaults for 4 new blocks
- `GSTAPIIntegration.tsx` — replace `simulateApi` calls with real `fetch` for all 4 APIs; update badge labels; update description text
- Import Data fix already applied (Service Invoice, Proforma Invoice, Credit Note, Debit Note tabs live)

### Remove
- `simulateApi` helper function (no longer needed once all 4 are real calls)
- Toast messages saying "(simulated)"
- "Demo / Simulation Mode" amber banner (replace with factual CORS note)

## Implementation Plan

1. Extend `ApiSettings` type in `types/gst.ts` with `einvoice`, `ewaybill`, `gstnReturn`, `accountAggregator` blocks
2. Rewrite `GSTAPIIntegration.tsx`:
   - Remove `simulateApi` + `generateIRN` + `generateEWBNumber` random generators
   - `handleEInvoice`: reads `einvoice` config, POSTs to configured IRP URL, handles 401/CORS/success
   - `handleEWayBill`: reads `ewaybill` config, POSTs to configured NIC URL
   - `handleGSTRFetch`: reads `gstnReturn` config, GETs from configured GSTN returns URL
   - `handleBankSync`: reads `accountAggregator` config; if sandbox, calls `https://api.sandbox.sahamati.org.in`; opens consent URL in a new window; polls for FI data
   - All 4 show "No API key configured" state when key is absent, "Direct API" badge when key present, "Live ✓" on success, CORS error with explanation on failure
   - Update disclaimer banner to explain CORS reality and link to Settings > API Config
3. Update `APIConfig.tsx`:
   - Add `e-Invoice IRP` card: endpoint info (einvoice1.gst.gov.in), sandbox toggle, url/key/clientId/clientSecret fields, Test Connection
   - Add `e-Way Bill (NIC)` card: endpoint info (ewaybillgst.gov.in), sandbox toggle, url/username/key fields, Test Connection
   - Add `GSTN Return Fetch` card: endpoint info, url/clientId/key fields, Test Connection
   - Add `RBI Account Aggregator` card: endpoint info (sahamati.org.in), sandbox toggle, clientId/clientSecret/redirectUri fields, Test Connection (ping sandbox health endpoint)
4. Run frontend validate
