import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import {
  useItems as useItemsBackend,
  useParties as usePartiesBackend,
  useTaxRates as useTaxRatesBackend,
} from "./useBackendStore";

// Re-export the business profile hooks that still use the legacy backend
import { useQuery } from "@tanstack/react-query";
import type { BusinessProfile } from "../backend.d";
import { RegistrationType } from "../backend.d";

export { RegistrationType };

// Legacy enum shims — these match the string values in GSTParty / GSTItem so
// any existing code that imports ItemType / PartyType still works correctly.
export const ItemType = {
  goods: "goods" as const,
  service: "service" as const,
};

export const PartyType = {
  customer: "customer" as const,
  vendor: "vendor" as const,
  both: "both" as const,
};

// Business Profile — still uses the legacy Motoko structured backend
export function useBusinessProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<BusinessProfile | null>({
    queryKey: ["businessProfile"],
    queryFn: async () => {
      if (!actor) {
        // Fall back to localStorage when actor is not available
        const stored = localStorage.getItem("gst_business_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...parsed,
            stateCode: BigInt(parsed.stateCode ?? 27),
          } as BusinessProfile;
        }
        return null;
      }
      try {
        const result = await actor.getBusinessProfile();
        if (result !== null && result !== undefined) {
          return result;
        }
        // Actor returned null — fall back to localStorage
        const stored = localStorage.getItem("gst_business_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...parsed,
            stateCode: BigInt(parsed.stateCode ?? 27),
          } as BusinessProfile;
        }
        return null;
      } catch {
        // Actor call failed — fall back to localStorage
        const stored = localStorage.getItem("gst_business_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...parsed,
            stateCode: BigInt(parsed.stateCode ?? 27),
          } as BusinessProfile;
        }
        return null;
      }
    },
    enabled: !isFetching,
  });
}

export function useSetBusinessProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: BusinessProfile) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.setBusinessProfile(profile);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["businessProfile"] });
    },
  });
}

// Parties — delegate entirely to backend store (string IDs, per-business)
export function useParties() {
  const { parties, ...rest } = usePartiesBackend();
  return { data: parties, ...rest };
}

// Legacy mutation shims for any remaining code that imports from useQueries
export function useAddParty() {
  const { addParty } = usePartiesBackend();
  return {
    mutate: (
      party: Parameters<typeof addParty>[0],
      opts?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        addParty(party);
        opts?.onSuccess?.();
      } catch {
        opts?.onError?.();
      }
    },
    mutateAsync: (party: Parameters<typeof addParty>[0]) =>
      Promise.resolve(addParty(party)),
    isPending: false,
  };
}

export function useUpdateParty() {
  const { updateParty } = usePartiesBackend();
  return {
    mutate: (
      args: { id: string; party: Parameters<typeof updateParty>[1] },
      opts?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        updateParty(args.id, args.party);
        opts?.onSuccess?.();
      } catch {
        opts?.onError?.();
      }
    },
    mutateAsync: (args: {
      id: string;
      party: Parameters<typeof updateParty>[1];
    }) => {
      updateParty(args.id, args.party);
      return Promise.resolve();
    },
    isPending: false,
  };
}

export function useDeleteParty() {
  const { deleteParty } = usePartiesBackend();
  return {
    mutate: (
      id: string,
      opts?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        deleteParty(id);
        opts?.onSuccess?.();
      } catch {
        opts?.onError?.();
      }
    },
    mutateAsync: (id: string) => {
      deleteParty(id);
      return Promise.resolve();
    },
    isPending: false,
  };
}

// Items — delegate entirely to backend store
export function useItems() {
  const { items, ...rest } = useItemsBackend();
  return { data: items, ...rest };
}

export function useAddItem() {
  const { addItem } = useItemsBackend();
  return {
    mutate: (
      item: Parameters<typeof addItem>[0],
      opts?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        addItem(item);
        opts?.onSuccess?.();
      } catch {
        opts?.onError?.();
      }
    },
    mutateAsync: (item: Parameters<typeof addItem>[0]) =>
      Promise.resolve(addItem(item)),
    isPending: false,
  };
}

export function useUpdateItem() {
  const { updateItem } = useItemsBackend();
  return {
    mutate: (
      args: { id: string; item: Parameters<typeof updateItem>[1] },
      opts?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        updateItem(args.id, args.item);
        opts?.onSuccess?.();
      } catch {
        opts?.onError?.();
      }
    },
    mutateAsync: (args: {
      id: string;
      item: Parameters<typeof updateItem>[1];
    }) => {
      updateItem(args.id, args.item);
      return Promise.resolve();
    },
    isPending: false,
  };
}

export function useDeleteItem() {
  const { deleteItem } = useItemsBackend();
  return {
    mutate: (
      id: string,
      opts?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        deleteItem(id);
        opts?.onSuccess?.();
      } catch {
        opts?.onError?.();
      }
    },
    mutateAsync: (id: string) => {
      deleteItem(id);
      return Promise.resolve();
    },
    isPending: false,
  };
}

// Tax Rates — delegate entirely to backend store
export function useTaxRates() {
  const { taxRates, ...rest } = useTaxRatesBackend();
  return { data: taxRates, ...rest };
}

export function useAddTaxRate() {
  const { addTaxRate } = useTaxRatesBackend();
  return {
    mutate: (
      rate: Parameters<typeof addTaxRate>[0],
      opts?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        addTaxRate(rate);
        opts?.onSuccess?.();
      } catch {
        opts?.onError?.();
      }
    },
    mutateAsync: (rate: Parameters<typeof addTaxRate>[0]) =>
      Promise.resolve(addTaxRate(rate)),
    isPending: false,
  };
}

export function useUpdateTaxRate() {
  const { updateTaxRate } = useTaxRatesBackend();
  return {
    mutate: (
      args: { id: string; taxRate: Parameters<typeof updateTaxRate>[1] },
      opts?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        updateTaxRate(args.id, args.taxRate);
        opts?.onSuccess?.();
      } catch {
        opts?.onError?.();
      }
    },
    mutateAsync: (args: {
      id: string;
      taxRate: Parameters<typeof updateTaxRate>[1];
    }) => {
      updateTaxRate(args.id, args.taxRate);
      return Promise.resolve();
    },
    isPending: false,
  };
}

export function useDeleteTaxRate() {
  const { deleteTaxRate } = useTaxRatesBackend();
  return {
    mutate: (
      id: string,
      opts?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        deleteTaxRate(id);
        opts?.onSuccess?.();
      } catch {
        opts?.onError?.();
      }
    },
    mutateAsync: (id: string) => {
      deleteTaxRate(id);
      return Promise.resolve();
    },
    isPending: false,
  };
}

// User Profile
export function useUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}
