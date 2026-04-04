import { useCallback } from "react";
import { useBusinessContext } from "./useBusinessContext";
import { useLocalStorage } from "./useLocalStorage";

const EXTENDED_PROFILE_KEY = "gst_extended_profile";
const LOCAL_BUSINESS_NAME_KEY = "gst_local_business_name";

const DEFAULT_LOGO = "/assets/uploads/MILITIS-Logo-1M-1-1.JPG";

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

export function useExtendedProfile() {
  const { activeBizId } = useBusinessContext();
  // Namespace the extended profile key per business
  const key = activeBizId
    ? `gst_${activeBizId}_extended_profile`
    : EXTENDED_PROFILE_KEY;

  const [profile, setProfile] = useLocalStorage<ExtendedBusinessProfile>(
    key,
    DEFAULT_EXTENDED,
  );

  const saveProfile = useCallback(
    (updates: Partial<ExtendedBusinessProfile>) => {
      setProfile((prev) => ({ ...prev, ...updates }));
    },
    [setProfile],
  );

  return { profile, saveProfile };
}

/** Cached business name in localStorage so it shows immediately without waiting for the canister */
export function useLocalBusinessName() {
  const { activeBusiness } = useBusinessContext();
  // Prefer the live business name from the business context
  const liveNameFromContext = activeBusiness?.name || "";

  const { activeBizId } = useBusinessContext();
  const key = activeBizId
    ? `gst_${activeBizId}_local_business_name`
    : LOCAL_BUSINESS_NAME_KEY;

  const [localName, setLocalName] = useLocalStorage<string>(key, "");

  const saveLocalBusinessName = useCallback(
    (name: string) => {
      setLocalName(name);
    },
    [setLocalName],
  );

  // Return the live context name if available, else fall back to the cached key
  return {
    localName: liveNameFromContext || localName,
    saveLocalBusinessName,
  };
}
