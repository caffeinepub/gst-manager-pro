import { useEffect } from "react";
import { useBusinessContext } from "./useBusinessContext";

export interface ThemeTokens {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  sidebar: string;
  sidebarForeground: string;
}

export const THEME_PRESETS: Record<string, ThemeTokens> = {
  "blue-corporate": {
    primary: "0.32 0.1 254",
    secondary: "0.92 0.01 254",
    background: "0.985 0.003 254",
    foreground: "0.18 0.04 254",
    sidebar: "0.22 0.065 254",
    sidebarForeground: "0.93 0.015 254",
  },
  "green-fresh": {
    primary: "0.45 0.15 142",
    secondary: "0.92 0.02 142",
    background: "0.97 0.005 142",
    foreground: "0.15 0.04 142",
    sidebar: "0.18 0.06 142",
    sidebarForeground: "0.93 0.015 142",
  },
  "dark-professional": {
    primary: "0.62 0.12 254",
    secondary: "0.24 0.05 254",
    background: "0.14 0.03 254",
    foreground: "0.93 0.015 254",
    sidebar: "0.12 0.03 254",
    sidebarForeground: "0.9 0.015 254",
  },
  "saffron-classic": {
    primary: "0.65 0.2 45",
    secondary: "0.93 0.03 45",
    background: "0.98 0.005 45",
    foreground: "0.18 0.05 45",
    sidebar: "0.25 0.08 45",
    sidebarForeground: "0.95 0.015 45",
  },
  "purple-fintech": {
    primary: "0.42 0.2 290",
    secondary: "0.92 0.02 290",
    background: "0.97 0.005 290",
    foreground: "0.18 0.04 290",
    sidebar: "0.2 0.07 290",
    sidebarForeground: "0.93 0.015 290",
  },
  "slate-minimal": {
    primary: "0.35 0.02 254",
    secondary: "0.9 0.01 254",
    background: "0.97 0.002 254",
    foreground: "0.2 0.02 254",
    sidebar: "0.25 0.01 254",
    sidebarForeground: "0.93 0.005 254",
  },
};

export const GOOGLE_FONTS: Record<string, { display: string; param: string }> =
  {
    Roboto: {
      display: "Roboto",
      param: "Roboto:wght@300;400;500;600;700",
    },
    "Open Sans": {
      display: "Open Sans",
      param: "Open+Sans:wght@300;400;600;700",
    },
    Montserrat: {
      display: "Montserrat",
      param: "Montserrat:wght@300;400;500;600;700",
    },
    "Playfair Display": {
      display: "Playfair Display",
      param: "Playfair+Display:wght@400;500;600;700",
    },
    Cinzel: {
      display: "Cinzel",
      param: "Cinzel:wght@400;600;700",
    },
    Poppins: {
      display: "Poppins",
      param: "Poppins:wght@300;400;500;600;700",
    },
    Inter: {
      display: "Inter",
      param: "Inter:wght@300;400;500;600;700",
    },
    Lato: {
      display: "Lato",
      param: "Lato:wght@300;400;700",
    },
  };

const DEFAULT_PRESET = "blue-corporate";

function applyPresetTokens(tokens: ThemeTokens) {
  const root = document.documentElement;
  root.style.setProperty("--primary", tokens.primary);
  root.style.setProperty("--secondary", tokens.secondary);
  root.style.setProperty("--background", tokens.background);
  root.style.setProperty("--foreground", tokens.foreground);
  root.style.setProperty("--sidebar", tokens.sidebar);
  root.style.setProperty("--sidebar-foreground", tokens.sidebarForeground);
  // Derive related tokens from primary
  root.style.setProperty("--ring", tokens.primary);
  root.style.setProperty("--sidebar-primary", tokens.primary);
  root.style.setProperty("--sidebar-ring", tokens.primary);
}

function clearCustomProperties() {
  const root = document.documentElement;
  const propsToReset = [
    "--primary",
    "--secondary",
    "--background",
    "--foreground",
    "--sidebar",
    "--sidebar-foreground",
    "--ring",
    "--sidebar-primary",
    "--sidebar-ring",
  ];
  for (const prop of propsToReset) {
    root.style.removeProperty(prop);
  }
}

function injectGoogleFont(fontName: string) {
  const fontData = GOOGLE_FONTS[fontName];
  if (!fontData) return;

  const linkId = `gf-${fontName.replace(/\s+/g, "-").toLowerCase()}`;
  if (!document.getElementById(linkId)) {
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontData.param}&display=swap`;
    document.head.appendChild(link);
  }

  document.body.style.fontFamily = `"${fontData.display}", system-ui, sans-serif`;
}

function injectCustomFont(base64: string, fontName: string) {
  // Remove existing custom font style tag
  const existing = document.getElementById("biz-custom-font");
  if (existing) existing.remove();

  // Determine format from name extension
  const ext = fontName.split(".").pop()?.toLowerCase() ?? "ttf";
  const format = ext === "woff2" ? "woff2" : "truetype";

  const style = document.createElement("style");
  style.id = "biz-custom-font";
  style.textContent = `
    @font-face {
      font-family: 'BizCustomFont';
      src: url('${base64}') format('${format}');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
  document.body.style.fontFamily = "'BizCustomFont', system-ui, sans-serif";
}

function resetFont() {
  // Remove injected custom font
  const customStyle = document.getElementById("biz-custom-font");
  if (customStyle) customStyle.remove();
  // Reset body font to default
  document.body.style.fontFamily = "";
}

function applyPrintTheme(primaryColor: string) {
  const existing = document.getElementById("biz-print-theme");
  if (existing) existing.remove();

  const style = document.createElement("style");
  style.id = "biz-print-theme";
  style.textContent = `
    @media print {
      :root {
        --primary: ${primaryColor};
      }
    }
  `;
  document.head.appendChild(style);
}

function removePrintTheme() {
  const existing = document.getElementById("biz-print-theme");
  if (existing) existing.remove();
}

function applyBusinessTheme(
  business: {
    fontFamily?: string;
    customFontBase64?: string;
    customFontName?: string;
    themePreset?: string;
    primaryColor?: string;
    secondaryColor?: string;
    bgColor?: string;
    textColor?: string;
  } | null,
) {
  if (!business) {
    // Apply default theme
    clearCustomProperties();
    resetFont();
    removePrintTheme();
    return;
  }

  // ── Theme ────────────────────────────────────────────────────────────
  const preset = business.themePreset ?? DEFAULT_PRESET;
  const presetTokens = THEME_PRESETS[preset] ?? THEME_PRESETS[DEFAULT_PRESET];

  // Start with preset
  applyPresetTokens(presetTokens);

  // Override with custom colors if set
  const root = document.documentElement;
  if (business.primaryColor) {
    root.style.setProperty("--primary", business.primaryColor);
    root.style.setProperty("--ring", business.primaryColor);
    root.style.setProperty("--sidebar-primary", business.primaryColor);
    root.style.setProperty("--sidebar-ring", business.primaryColor);
  }
  if (business.secondaryColor) {
    root.style.setProperty("--secondary", business.secondaryColor);
  }
  if (business.bgColor) {
    root.style.setProperty("--background", business.bgColor);
  }
  if (business.textColor) {
    root.style.setProperty("--foreground", business.textColor);
  }

  // Print theme uses the resolved primary color
  const resolvedPrimary = business.primaryColor ?? presetTokens.primary;
  applyPrintTheme(resolvedPrimary);

  // ── Font ─────────────────────────────────────────────────────────────
  if (
    business.fontFamily === "custom" &&
    business.customFontBase64 &&
    business.customFontName
  ) {
    injectCustomFont(business.customFontBase64, business.customFontName);
  } else if (
    business.fontFamily &&
    business.fontFamily !== "custom" &&
    GOOGLE_FONTS[business.fontFamily]
  ) {
    injectGoogleFont(business.fontFamily);
  } else {
    resetFont();
  }
}

export function useBusinessTheme() {
  const { activeBusiness } = useBusinessContext();

  // Apply theme whenever activeBusiness changes (covers business switch too)
  useEffect(() => {
    applyBusinessTheme(activeBusiness);
  }, [activeBusiness]);
}
