import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next =
          typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore quota errors
        }
        return next;
      });
    },
    [key],
  );

  // Sync across tabs and after cloud restore
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          // ignore malformed JSON
        }
      }
    };

    // Also listen for custom cloud sync events
    const handleCloudSync = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item) as T);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("gst-cloud-restored", handleCloudSync);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("gst-cloud-restored", handleCloudSync);
    };
  }, [key]);

  return [storedValue, setValue] as const;
}
