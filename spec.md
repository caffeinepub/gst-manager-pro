# GST Manager Pro

## Current State

- Multi-business support is live (Version 48+). Each business has an isolated `id`, `name`, `gstin`, `stateCode`, `logo` (base64), and `role` stored in the `Business` interface in `useBusinessContext.ts`.
- The `logo` field already exists on the `Business` object and is shown in the sidebar (`BusinessSwitcher`) and header (`Header.tsx`).
- `BusinessProfile.tsx` has a logo upload section that calls `saveLogo()` from `useBusinessLogo.ts`, which writes the base64 to `activeBusiness.logo` via `updateBusiness`.
- No font customization exists -- all businesses use the same Plus Jakarta Sans body font and Huxley Titling for the business name.
- No theme customization exists -- all businesses share the same global OKLCH CSS tokens.
- The app applies CSS variables via `index.css` on `:root` and `.dark`. There is no per-business theming mechanism.

## Requested Changes (Diff)

### Add
- `BusinessBranding` interface: extend `Business` with `fontFamily`, `customFontBase64`, `customFontName`, `themePreset`, `primaryColor`, `secondaryColor`, `bgColor`, `textColor`.
- `useBusinessTheme` hook: reads active business branding settings and injects CSS custom properties onto `document.documentElement` whenever the active business changes. Applies font-family via a `<style>` tag injected into `<head>`.
- Theme presets: 6 pre-built named themes with OKLCH token sets -- Blue Corporate (current default), Green Fresh, Dark Professional, Saffron Classic, Purple Fintech, Slate Minimal.
- Business Profile > new **Font & Theme** card section with:
  - Preset font dropdown (Roboto, Open Sans, Montserrat, Playfair Display, Cinzel, Poppins, Inter, Lato)
  - Custom font upload (.ttf / .woff2) -- stored as base64 on the business record
  - Theme preset picker (6 cards with color swatches, click to apply instantly)
  - Individual color pickers for primary, secondary, background, text
  - All changes apply live (no save needed to preview)
  - Save button persists settings
- Theme tokens also applied in invoice/print CSS via `@media print` style injection so printed docs use the business's primary color.

### Modify
- `Business` interface in `useBusinessContext.ts`: add branding fields.
- `App.tsx`: wrap `AuthenticatedApp` with a `BusinessThemeProvider` that calls `useBusinessTheme`.
- `BusinessProfile.tsx`: add Font & Theme card section.
- `useBusinessLogo.ts`: no changes needed (logo already on business object).
- `index.css`: ensure CSS variables are structured to support runtime override via `document.documentElement.style.setProperty`.

### Remove
- Nothing removed.

## Implementation Plan

1. Extend `Business` interface with branding fields: `fontFamily`, `customFontBase64`, `customFontName`, `themePreset`, `primaryColor`, `secondaryColor`, `bgColor`, `textColor`.
2. Create `src/frontend/src/hooks/useBusinessTheme.ts` -- hook that watches active business ID, reads branding from the business record, and applies CSS custom properties to `document.documentElement` plus injects a `@font-face` rule if a custom font is set.
3. Define 6 theme presets as named OKLCH token maps in the hook file.
4. Add a `BusinessThemeProvider` wrapper component that calls `useBusinessTheme` and renders children -- mount it in `App.tsx` inside `AuthenticatedApp`.
5. Update `BusinessProfile.tsx` to add a Font & Theme card:
   - Preset font selector (8 Google Fonts + custom upload)
   - Custom font upload handler (read as base64, store on business)
   - Theme preset grid (6 clickable preset cards with live preview swatches)
   - 4 color pickers (primary, secondary, background, text)
   - All onChange handlers call `updateBusiness` immediately for live preview
   - Save button saves the whole profile including branding
6. Ensure the theme is re-applied on business switch via the `gst-business-switched` event in `useBusinessTheme`.
7. Validate build passes (typecheck + lint).
