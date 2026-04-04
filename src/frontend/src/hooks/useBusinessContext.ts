import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface Business {
  id: string;
  name: string;
  gstin: string;
  stateCode: string;
  logo?: string; // base64 or URL
  role: "admin" | "user";
  businessType?: "Regular" | "Composition" | "Unregistered";
  createdAt: string;
  updatedAt: string;
}

const BUSINESSES_KEY = "gst_businesses";
const ACTIVE_BIZ_KEY = "gst_active_business";

function now() {
  return new Date().toISOString();
}

function generateId() {
  return `biz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useBusinessContext() {
  const [businesses, setBusinesses] = useLocalStorage<Business[]>(
    BUSINESSES_KEY,
    [],
  );
  const [activeBizId, setActiveBizId] = useLocalStorage<string>(
    ACTIVE_BIZ_KEY,
    "",
  );

  // Listen for gst-business-switched event to trigger re-reads
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handleSwitch = () => {
      forceUpdate((n) => n + 1);
    };
    window.addEventListener("gst-business-switched", handleSwitch);
    return () => {
      window.removeEventListener("gst-business-switched", handleSwitch);
    };
  }, []);

  const activeBusiness =
    businesses.find((b) => b.id === activeBizId) ?? businesses[0] ?? null;

  const addBusiness = useCallback(
    (biz: Omit<Business, "id" | "createdAt" | "updatedAt">) => {
      const newBiz: Business = {
        ...biz,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      // Read current businesses directly to check if first
      const stored = localStorage.getItem(BUSINESSES_KEY);
      const current: Business[] = stored ? JSON.parse(stored) : [];
      const isFirst = current.length === 0;

      setBusinesses((prev) => [...prev, newBiz]);

      if (isFirst) {
        setActiveBizId(newBiz.id);
        window.dispatchEvent(new CustomEvent("gst-business-switched"));
      }

      return newBiz.id;
    },
    [setBusinesses, setActiveBizId],
  );

  const updateBusiness = useCallback(
    (id: string, updates: Partial<Business>) => {
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, ...updates, updatedAt: now() } : b,
        ),
      );
    },
    [setBusinesses],
  );

  const deleteBusiness = useCallback(
    (id: string) => {
      setBusinesses((prev) => prev.filter((b) => b.id !== id));
      const stored = localStorage.getItem(BUSINESSES_KEY);
      const current: Business[] = stored ? JSON.parse(stored) : [];
      const remaining = current.filter((b) => b.id !== id);
      if (activeBizId === id) {
        const nextId = remaining[0]?.id ?? "";
        setActiveBizId(nextId);
        window.dispatchEvent(new CustomEvent("gst-business-switched"));
      }
    },
    [setBusinesses, activeBizId, setActiveBizId],
  );

  const switchBusiness = useCallback(
    (id: string) => {
      setActiveBizId(id);
      window.dispatchEvent(new CustomEvent("gst-business-switched"));
    },
    [setActiveBizId],
  );

  return {
    activeBizId: activeBizId || null,
    activeBusiness,
    businesses,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    switchBusiness,
  };
}
