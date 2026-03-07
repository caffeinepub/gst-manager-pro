import { createContext, useContext, useState } from "react";

type Lang = "en" | "hi";

const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
  sales: { en: "Sales", hi: "बिक्री" },
  purchases: { en: "Purchases", hi: "खरीद" },
  invoices: { en: "Invoices", hi: "चालान" },
  parties: { en: "Parties", hi: "पार्टियां" },
  items: { en: "Items", hi: "वस्तुएं" },
  accounting: { en: "Accounting", hi: "लेखांकन" },
  reports: { en: "Reports", hi: "रिपोर्ट" },
  compliance: { en: "Compliance", hi: "अनुपालन" },
  inventory: { en: "Inventory", hi: "सूची" },
  profile: { en: "Profile", hi: "प्रोफाइल" },
  payments: { en: "Payments", hi: "भुगतान" },
  journal: { en: "Journal", hi: "जर्नल" },
  banking: { en: "Banking", hi: "बैंकिंग" },
  settings: { en: "Settings", hi: "सेटिंग्स" },
  save: { en: "Save", hi: "सहेजें" },
  cancel: { en: "Cancel", hi: "रद्द करें" },
  delete: { en: "Delete", hi: "हटाएं" },
  search: { en: "Search", hi: "खोजें" },
  filter: { en: "Filter", hi: "फ़िल्टर" },
  export: { en: "Export", hi: "निर्यात" },
  total: { en: "Total", hi: "कुल" },
  status: { en: "Status", hi: "स्थिति" },
  date: { en: "Date", hi: "तारीख" },
  amount: { en: "Amount", hi: "राशि" },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  const t = (key: string): string => {
    return TRANSLATIONS[key]?.[lang] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
