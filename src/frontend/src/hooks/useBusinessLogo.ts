import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const LOGO_KEY = "gst_business_logo";
const EXTENDED_PROFILE_KEY = "gst_extended_profile";
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

export function useBusinessLogo() {
  const [logo, setLogo] = useLocalStorage<string>(LOGO_KEY, "");

  const saveLogo = useCallback(
    (base64: string) => {
      setLogo(base64);
    },
    [setLogo],
  );

  const clearLogo = useCallback(() => {
    setLogo("");
  }, [setLogo]);

  return { logo, saveLogo, clearLogo };
}

export function useExtendedProfile() {
  const [profile, setProfile] = useLocalStorage<ExtendedBusinessProfile>(
    EXTENDED_PROFILE_KEY,
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
  const [localName, setLocalName] = useLocalStorage<string>(
    LOCAL_BUSINESS_NAME_KEY,
    "",
  );

  const saveLocalBusinessName = useCallback(
    (name: string) => {
      setLocalName(name);
    },
    [setLocalName],
  );

  return { localName, saveLocalBusinessName };
}
