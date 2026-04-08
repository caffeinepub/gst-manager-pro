import { useCallback } from "react";
import { useBizConfig } from "./useBackendStore";
import { useBusinessContext } from "./useBusinessContext";

const DEFAULT_LOGO = "/assets/MILITIS-Logo-1M-1.JPG";
const LOCAL_BUSINESS_NAME_KEY = "gst_local_business_name";

export interface ExtendedBusinessProfile {
  tradeName: string;
  pan: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  pin: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  branch: string;
  cin: string;
  msmeNo: string;
  invoicePrefix: string;
  fiscalYearStart: string;
}

const DEFAULT_EXTENDED: ExtendedBusinessProfile = {
  tradeName: "",
  pan: "",
  email: "",
  phone: "",
  website: "",
  city: "",
  pin: "",
  bankName: "",
  accountNo: "",
  ifsc: "",
  branch: "",
  cin: "",
  msmeNo: "",
  invoicePrefix: "INV",
  fiscalYearStart: "04",
};

/**
 * Per-business logo hook.
 * Reads from and writes to the active business object in the businesses list,
 * so each business has its own isolated logo.
 */
export function useBusinessLogo() {
  const { activeBusiness, activeBizId, updateBusiness } = useBusinessContext();

  // The logo is stored on the Business object itself
  const logo = activeBusiness?.logo || "";

  const saveLogo = useCallback(
    (base64: string) => {
      if (activeBizId) {
        updateBusiness(activeBizId, { logo: base64 });
      }
    },
    [activeBizId, updateBusiness],
  );

  const clearLogo = useCallback(() => {
    if (activeBizId) {
      updateBusiness(activeBizId, { logo: "" });
    }
  }, [activeBizId, updateBusiness]);

  return { logo: logo || DEFAULT_LOGO, saveLogo, clearLogo };
}

/**
 * Extended business profile — now backed by useBizConfig (per-business ICP storage).
 * Fields: tradeName, PAN, bank details, invoicePrefix are all stored in the canister.
 */
export function useExtendedProfile() {
  const [profile, setProfileRaw] = useBizConfig<ExtendedBusinessProfile>(
    "extended_profile",
    DEFAULT_EXTENDED,
  );

  const saveProfile = useCallback(
    (updates: Partial<ExtendedBusinessProfile>) => {
      setProfileRaw({ ...profile, ...updates });
    },
    [profile, setProfileRaw],
  );

  return { profile, saveProfile };
}

/** Cached business name — prefer live context, fallback to localStorage cache */
export function useLocalBusinessName() {
  const { activeBusiness, activeBizId } = useBusinessContext();
  // Prefer the live business name from the business context
  const liveNameFromContext = activeBusiness?.name || "";

  const key = activeBizId
    ? `gst_${activeBizId}_local_business_name`
    : LOCAL_BUSINESS_NAME_KEY;

  const saveLocalBusinessName = useCallback(
    (name: string) => {
      localStorage.setItem(key, name);
    },
    [key],
  );

  const localName = liveNameFromContext || localStorage.getItem(key) || "";

  return { localName, saveLocalBusinessName };
}
