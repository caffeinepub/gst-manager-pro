import { useCallback, useEffect, useState } from "react";
import { useBusinessBackend } from "./useBackendStore";
import type { Business } from "./useBackendStore";

export type { Business };

// Re-export Business interface and expose via useBusinessContext
// The backing implementation now uses the ICP backend instead of localStorage.

export function useBusinessContext() {
  const backend = useBusinessBackend();

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

  return {
    activeBizId: backend.activeBizId,
    activeBusiness: backend.activeBusiness,
    businesses: backend.businesses,
    addBusiness: backend.addBusiness,
    updateBusiness: backend.updateBusiness,
    deleteBusiness: backend.deleteBusiness,
    switchBusiness: backend.switchBusiness,
    isLoading: backend.isLoading,
  };
}
