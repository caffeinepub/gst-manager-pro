# GST Manager Pro

## Current State

The app has two places where GSTIN/PAN validation exists:

1. **GSTAPIIntegration.tsx** (`gst-api-integration` page) — Has a GSTIN Validation API card and a PAN Validation API card. Both are fully simulated: `handleGSTINValidate` generates a fake legal name from GSTIN characters with a `setTimeout`, and `handlePANValidate` (implied from structure) does the same. Both are badged "Simulated". No real HTTP calls are made.

2. **Parties.tsx** (`masters-parties` page) — Has a "Validate GSTIN" button inline in Add/Edit Party dialog. It runs a `setTimeout` simulation, not a real API call.

3. **APIConfig.tsx** (`settings-api-config` page) — Has configuration fields for GSTN (key, URL, clientId, clientSecret, enabled) and PAN (key, URL, enabled), stored in localStorage as `api_settings`.

The `AppPage` type does not include a dedicated verification page.

---

## Requested Changes (Diff)

### Add

- **New page: `GSTINPANVerification.tsx`** — A dedicated, standalone verification screen under GST Compliance with:
  - GSTIN verification tab: calls the real GSTN API (https://api.gst.gov.in/enriched/commonapi/search?action=TP&gstin=<GSTIN>) with `auth_token` from saved API settings. On success, displays: Legal Name, Trade Name, Registration Status, Taxpayer Type (Regular/Composition/etc.), State, Principal Place of Business, Additional Places, Filing Status, Registration Date.
  - PAN verification tab: calls Income Tax e-Filing API (https://efilinguat.incometax.gov.in/uat/login or production equivalent) using saved API key. On success, displays: PAN Holder Name, PAN Type (Individual/Company/HUF/Firm/etc.), Status (Valid/Invalid/Deactivated).
  - Both tabs support entering any GSTIN/PAN for lookup, not just saved parties.
  - History of recent lookups persisted in localStorage (last 10 per type).
  - "Save to Party" button — if the verified entity matches an existing party by GSTIN/PAN, offer to update that party record with the fetched details; otherwise offer to create a new party.
  - Clearly shows whether the API key is configured (links to Settings > API Config if not).
  - Error handling: shows specific error messages (invalid format, API error, network error, auth failed, not found).

- **New page route: `gst-verification`** — Added to `AppPage` type and `PageContent` switch in `main.tsx`.

- **New nav entry** — Add "GSTIN/PAN Verify" under GST Compliance in the sidebar and bottom nav.

- **Inline verification upgrade in Parties.tsx** — Replace the simulated `validateGstin` with a real API call using the same service layer as the standalone page. Add a PAN verify button inline too.

- **Service layer: `gstVerificationService.ts`** — Central module that:
  - Reads `api_settings` from localStorage to get keys/URLs.
  - Makes GSTIN lookup: `GET https://api.gst.gov.in/enriched/commonapi/search?action=TP&gstin={gstin}` with `Auth-Token` header.
  - Makes PAN lookup via Income Tax Department API: `GET https://api.incometax.gov.in/v1/pan-allotment?pan={pan}` with API key header.
  - Both support sandbox/production mode based on a `sandboxMode` flag in API settings.
  - Returns typed `GSTINVerificationResult` and `PANVerificationResult` interfaces.
  - Wraps calls in try/catch and returns structured error objects.

- **Updated `ApiSettings` type** — Add `sandboxMode: boolean` to the `gstn` and `pan` sections, and a `baseUrl` override so users can point to sandbox vs production GSTN endpoint.

- **Updated `APIConfig.tsx`** — Add sandbox/production toggle and base URL display for GSTN and PAN sections with guidance text showing the correct production endpoints.

### Modify

- **`GSTAPIIntegration.tsx`** — Replace simulated `handleGSTINValidate` and `handlePANValidate` with real calls to the new `gstVerificationService`. Badge changes from "Simulated" to "Live" when API key is configured. Retain simulation fallback when no key is set.

- **`Parties.tsx`** — Replace simulated `validateGstin` with real API call. Add a PAN verify button. On successful GSTIN verification, auto-populate Legal Name, State Code fields if they are blank.

- **`types/gst.ts`** — Add `gst-verification` to `AppPage` union. Add `sandboxMode` to `ApiSettings`.

### Remove

- The fake `setTimeout`-based simulation logic from `handleGSTINValidate` and `handlePANValidate` in `GSTAPIIntegration.tsx` (replaced by real service calls with simulation fallback).

---

## Implementation Plan

1. **Update `types/gst.ts`**: Add `gst-verification` to `AppPage`. Extend `ApiSettings` with `sandboxMode` and production endpoint guidance.

2. **Create `src/frontend/src/services/gstVerificationService.ts`**:
   - `verifyGSTIN(gstin: string): Promise<GSTINVerificationResult>` — Reads saved API key, calls GSTN API (`https://api.gst.gov.in/enriched/commonapi/search?action=TP&gstin={gstin}`), parses response. Falls back to format-only validation with a clear "API key not configured" message when no key is set.
   - `verifyPAN(pan: string): Promise<PANVerificationResult>` — Reads saved API key, calls Income Tax API, parses response. Same fallback.
   - Both handle: 401 (auth failed), 404 (not found), 429 (rate limit), network errors.
   - GSTN production endpoint: `https://api.gst.gov.in/enriched/commonapi/search?action=TP&gstin={gstin}` with header `Auth-Token: <key>`.
   - PAN production endpoint: `https://api.incometax.gov.in/v1/pan-allotment-info` with `x-api-key` header.
   - Note: These government APIs require registration and whitelisted IPs in production; the UI must clearly communicate this. The implementation will make the real fetch call and gracefully handle CORS/network errors (expected in browser environment — users will need to use a backend proxy or configure CORS). Show a helpful message explaining if CORS blocks the call.

3. **Create `src/frontend/src/pages/GSTCompliance/GSTINPANVerification.tsx`**:
   - Two-tab layout: "GSTIN Verification" and "PAN Verification".
   - GSTIN tab: input field with format validation, Verify button, result card showing all fetched fields, history list (last 10), "Save to Party" action.
   - PAN tab: same pattern for PAN.
   - API key status banner ("API key not configured — configure in Settings > API Config").
   - All results and history stored in localStorage.

4. **Update `GSTAPIIntegration.tsx`**: Replace simulated handlers with `gstVerificationService` calls. Update badge to reflect live/simulated state.

5. **Update `Parties.tsx`**: Replace `validateGstin` simulation with `gstVerificationService.verifyGSTIN`. Add PAN verify button. Auto-populate name/state on success.

6. **Update `APIConfig.tsx`**: Add sandbox/production toggle and endpoint URL display for GSTN and PAN.

7. **Update `main.tsx`**: Import and register `GSTINPANVerification` for `gst-verification` route.

8. **Update `AppLayout.tsx`**: Add "GSTIN/PAN Verify" nav item under GST Compliance section.
