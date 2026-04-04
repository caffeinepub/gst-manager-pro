// GST & PAN Verification Service
// Calls real government APIs with graceful degradation when no API key is configured.

import type { ApiSettings } from "@/types/gst";
import { INDIAN_STATES } from "@/types/gst";

export interface GSTINVerificationResult {
  success: boolean;
  gstin: string;
  legalName?: string;
  tradeName?: string;
  status?: string;
  taxpayerType?: string;
  stateCode?: string;
  stateName?: string;
  principalAddress?: string;
  registrationDate?: string;
  filingStatus?: string;
  error?: string;
  errorCode?: string;
  source: "live" | "format_only";
}

export interface PANVerificationResult {
  success: boolean;
  pan: string;
  panHolderName?: string;
  panType?: string;
  status?: string;
  assessingOfficerCode?: string;
  error?: string;
  errorCode?: string;
  source: "live" | "format_only";
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const PAN_TYPE_MAP: Record<string, string> = {
  P: "Individual",
  C: "Company",
  H: "HUF",
  F: "Firm",
  A: "AOP",
  B: "BOI",
  G: "Government",
  J: "AJP",
  T: "Trust",
  L: "LLP",
};

function getApiSettings(): ApiSettings {
  try {
    const raw = localStorage.getItem("gst_api_settings");
    if (raw) return JSON.parse(raw) as ApiSettings;
  } catch {
    // ignore
  }
  return {
    gstn: { key: "", url: "", clientId: "", clientSecret: "", enabled: false },
    pan: { key: "", url: "", enabled: false },
    einvoice: {
      key: "",
      url: "",
      clientId: "",
      clientSecret: "",
      enabled: false,
    },
    ewaybill: { key: "", url: "", username: "", enabled: false },
    gstnReturn: { key: "", url: "", clientId: "", enabled: false },
    accountAggregator: {
      clientId: "",
      clientSecret: "",
      url: "",
      redirectUri: "",
      enabled: false,
    },
    banking: { key: "", url: "", bankName: "", accountId: "", enabled: false },
    sms: { provider: "msg91", key: "", senderId: "", enabled: false },
  };
}

function decodeStateCode(code: string): string {
  const state = INDIAN_STATES.find((s) => s.code === code.padStart(2, "0"));
  return state?.name ?? code;
}

function formatGSTNAddress(addrObj: unknown): string {
  if (!addrObj || typeof addrObj !== "object") return "";
  const a = addrObj as Record<string, string>;
  const parts = [
    a.bno,
    a.flno,
    a.bnm,
    a.st,
    a.loc,
    a.dst,
    a.stcd,
    a.pncd,
  ].filter(Boolean);
  return parts.join(", ");
}

// ─── GSTIN Verification ──────────────────────────────────────────────────────

export async function verifyGSTIN(
  gstin: string,
): Promise<GSTINVerificationResult> {
  const normalised = gstin.trim().toUpperCase();

  if (!GSTIN_REGEX.test(normalised)) {
    return {
      success: false,
      gstin: normalised,
      errorCode: "INVALID_FORMAT",
      error:
        "Invalid GSTIN format. Must be 15 characters: 2 digits + 5 uppercase letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric.",
      source: "format_only",
    };
  }

  const settings = getApiSettings();

  if (!settings.gstn.enabled || !settings.gstn.key) {
    return {
      success: false,
      gstin: normalised,
      errorCode: "NO_API_KEY",
      error:
        "GSTN API key not configured. Please configure in Settings > API Config.",
      source: "format_only",
    };
  }

  const endpoint = `https://api.gst.gov.in/enriched/commonapi/search?action=TP&gstin=${normalised}`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Auth-Token": settings.gstn.key,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 401) {
      return {
        success: false,
        gstin: normalised,
        errorCode: "AUTH_FAILED",
        error: "Authentication failed. Check your GSTN API key.",
        source: "live",
      };
    }

    if (res.status === 404) {
      return {
        success: false,
        gstin: normalised,
        errorCode: "NOT_FOUND",
        error: "GSTIN not found in the GST database.",
        source: "live",
      };
    }

    if (res.status === 429) {
      return {
        success: false,
        gstin: normalised,
        errorCode: "RATE_LIMITED",
        error: "Rate limit exceeded. Please try again later.",
        source: "live",
      };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        success: false,
        gstin: normalised,
        errorCode: "API_ERROR",
        error: `API error (HTTP ${res.status}): ${body || res.statusText}`,
        source: "live",
      };
    }

    const data = await res.json();
    const info = data?.taxpayerInfo ?? data;

    const stateCode = (info.stjCd ?? info.stateCode ?? normalised.slice(0, 2))
      .toString()
      .padStart(2, "0");
    const principalAddress = info.pradr
      ? typeof info.pradr === "string"
        ? info.pradr
        : formatGSTNAddress(info.pradr?.addr ?? info.pradr)
      : undefined;

    return {
      success: true,
      gstin: normalised,
      legalName: info.lgnm ?? info.legalName,
      tradeName: info.tradeNam ?? info.tradeName,
      status: info.sts ?? info.status ?? "Active",
      taxpayerType: info.dty ?? info.taxpayerType,
      stateCode,
      stateName: decodeStateCode(stateCode),
      principalAddress,
      registrationDate: info.rgdt ?? info.registrationDate,
      filingStatus: info.filingStatus,
      source: "live",
    };
  } catch (err) {
    if (err instanceof TypeError || (err as Error).name === "TypeError") {
      return {
        success: false,
        gstin: normalised,
        errorCode: "CORS_BLOCKED",
        error:
          "Network error. Government APIs require backend proxy or whitelisted IPs. Contact your system administrator.",
        source: "live",
      };
    }
    return {
      success: false,
      gstin: normalised,
      errorCode: "NETWORK_ERROR",
      error: `Network error: ${(err as Error).message ?? "Unknown error"}`,
      source: "live",
    };
  }
}

// ─── PAN Verification ────────────────────────────────────────────────────────

export async function verifyPAN(pan: string): Promise<PANVerificationResult> {
  const normalised = pan.trim().toUpperCase();

  if (!PAN_REGEX.test(normalised)) {
    return {
      success: false,
      pan: normalised,
      errorCode: "INVALID_FORMAT",
      error:
        "Invalid PAN format. Must be 10 characters: 5 uppercase letters + 4 digits + 1 uppercase letter (e.g. ABCDE1234F).",
      source: "format_only",
    };
  }

  const settings = getApiSettings();

  if (!settings.pan.enabled || !settings.pan.key) {
    return {
      success: false,
      pan: normalised,
      errorCode: "NO_API_KEY",
      error:
        "PAN API key not configured. Please configure in Settings > API Config.",
      source: "format_only",
    };
  }

  const endpoint = `https://api.incometax.gov.in/v1/pan-allotment-info?pan=${normalised}`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "x-api-key": settings.pan.key,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 401) {
      return {
        success: false,
        pan: normalised,
        errorCode: "AUTH_FAILED",
        error: "Authentication failed. Check your PAN API key.",
        source: "live",
      };
    }

    if (res.status === 404) {
      return {
        success: false,
        pan: normalised,
        errorCode: "NOT_FOUND",
        error: "PAN not found in the Income Tax database.",
        source: "live",
      };
    }

    if (res.status === 429) {
      return {
        success: false,
        pan: normalised,
        errorCode: "RATE_LIMITED",
        error: "Rate limit exceeded. Please try again later.",
        source: "live",
      };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        success: false,
        pan: normalised,
        errorCode: "API_ERROR",
        error: `API error (HTTP ${res.status}): ${body || res.statusText}`,
        source: "live",
      };
    }

    const data = await res.json();

    const firstName = data.firstName ?? data.first_name ?? "";
    const middleName = data.middleName ?? data.middle_name ?? "";
    const lastName = data.lastName ?? data.last_name ?? data.surName ?? "";
    const fullName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const rawPanType =
      data.panType ?? data.pan_type ?? data.type ?? normalised[3];
    const panType =
      PAN_TYPE_MAP[rawPanType?.toString().toUpperCase()] ?? rawPanType;

    return {
      success: true,
      pan: normalised,
      panHolderName: fullName || data.name || data.holderName,
      panType,
      status: data.panStatus ?? data.status ?? "Valid",
      assessingOfficerCode: data.assessingOfficerCode ?? data.ao_code,
      source: "live",
    };
  } catch (err) {
    if (err instanceof TypeError || (err as Error).name === "TypeError") {
      return {
        success: false,
        pan: normalised,
        errorCode: "CORS_BLOCKED",
        error:
          "Network error. Government APIs require backend proxy or whitelisted IPs. Contact your system administrator.",
        source: "live",
      };
    }
    return {
      success: false,
      pan: normalised,
      errorCode: "NETWORK_ERROR",
      error: `Network error: ${(err as Error).message ?? "Unknown error"}`,
      source: "live",
    };
  }
}
