# GST Manager Pro

## Current State

GST Manager Pro is a fully-featured single-business GST compliance and accounting app. All data is stored in localStorage under flat keys (`gst_invoices`, `gst_purchases`, `gst_parties`, etc.) without any business-level namespace. Authentication is via Internet Identity. The app has:

- Masters, Invoicing, Accounting, GST Compliance, Payroll, Reports, Settings modules
- `useGSTStore.ts` hooks using `useLocalStorage` with hardcoded localStorage keys
- `useCloudSync.ts` syncing all `gst_*` keys to the ICP backend
- `AppSidebar.tsx` with a `BusinessHeader` component at the top
- `Login.tsx` for Internet Identity auth
- `App.tsx` for routing between all pages

## Requested Changes (Diff)

### Add

- **Business type definition** (`Business` interface in `gst.ts`): id, name, gstin, stateCode, logo, role (`admin`|`user`), ownerId, createdAt
- **`useBusinessContext` hook**: manages active business ID in localStorage (`gst_active_business`), list of businesses (`gst_businesses`), CRUD for businesses
- **`BusinessManager` page** (new page `business-manager`): grid of all businesses with name, GSTIN, last sync, outstanding invoices; "Add Business" button; "Switch" and "Delete" actions per card
- **`BusinessSetupWizard` component**: shown on first launch (no businesses exist); 3-step wizard: (1) role selection admin vs user, (2) business name + GSTIN + state, (3) confirmation; creates first business and sets it as active
- **`BusinessSwitcher` component**: dropdown in AppSidebar header showing active business name + logo; opens a panel listing all businesses; "Add New Business" and "Manage Businesses" options
- **`AppPage` type extension**: add `"business-manager"` to the union
- **`seedData.ts` update**: seed data uses active business prefix instead of flat keys
- **New navbar entry**: "Businesses" link under Settings section or as a top-level sidebar item

### Modify

- **`useLocalStorage.ts`**: no changes to the hook itself; business-namespacing is done at the call-site key level
- **`useGSTStore.ts`**: all localStorage keys become dynamic: `gst_${bizId}_invoices`, `gst_${bizId}_purchases`, etc. All hooks read the active business ID from `useBusinessContext` to compute the namespaced key.
- **`useCloudSync.ts`**: sync keys filtered to `gst_${bizId}_*` for the active business only
- **`AppSidebar.tsx`**: replace static `BusinessHeader` in sidebar header area with `BusinessSwitcher` component
- **`App.tsx`**: wrap `AuthenticatedApp` with business context check; if no businesses exist, show `BusinessSetupWizard` instead of normal app; add `"business-manager"` case in `PageContent`
- **`Header.tsx`**: show active business name and sync status

### Remove

- Nothing removed; flat keys remain in localStorage for any legacy data but new data is written under business-namespaced keys

## Implementation Plan

1. Add `Business` type and `"business-manager"` to `AppPage` in `types/gst.ts`
2. Create `hooks/useBusinessContext.ts`: manages `gst_businesses` (array) and `gst_active_business` (string ID) in localStorage; exports `activeBizId`, `businesses`, `addBusiness`, `updateBusiness`, `deleteBusiness`, `switchBusiness`
3. Update `hooks/useGSTStore.ts`: all hooks accept `bizId` from `useBusinessContext` and use it to namespace keys
4. Update `hooks/useCloudSync.ts`: sync only `gst_${bizId}_*` keys
5. Create `components/BusinessSwitcher/BusinessSwitcher.tsx`: dropdown showing active biz, list panel, add/switch actions
6. Create `pages/Business/BusinessSetupWizard.tsx`: first-launch wizard (role + biz details + confirm)
7. Create `pages/Business/BusinessManager.tsx`: full business management page
8. Update `App.tsx`: add business context gating and `business-manager` route
9. Update `AppSidebar.tsx`: use `BusinessSwitcher` in header
10. Update `utils/seedData.ts`: use active biz ID prefix
11. Add sidebar navigation entry for Business Manager
