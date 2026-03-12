import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BusinessProfile, Item, Party, TaxRate } from "../backend.d";
import { ItemType, PartyType, RegistrationType } from "../backend.d";
import { useActor } from "./useActor";

export { ItemType, PartyType, RegistrationType };

// Business Profile
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

// Parties
export function useParties() {
  const { actor, isFetching } = useActor();
  return useQuery<Party[]>({
    queryKey: ["parties"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllParties();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddParty() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (party: Party) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.addParty(party);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
  });
}

export function useUpdateParty() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, party }: { id: bigint; party: Party }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateParty(id, party);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
  });
}

export function useDeleteParty() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteParty(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
  });
}

// Items
export function useItems() {
  const { actor, isFetching } = useActor();
  return useQuery<Item[]>({
    queryKey: ["items"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllItems();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Item) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.addItem(item);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, item }: { id: bigint; item: Item }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateItem(id, item);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteItem(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Tax Rates
export function useTaxRates() {
  const { actor, isFetching } = useActor();
  return useQuery<TaxRate[]>({
    queryKey: ["taxRates"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTaxRates();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddTaxRate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taxRate: TaxRate) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.addTaxRate(taxRate);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["taxRates"] });
    },
  });
}

export function useUpdateTaxRate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taxRate }: { id: bigint; taxRate: TaxRate }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateTaxRate(id, taxRate);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["taxRates"] });
    },
  });
}

export function useDeleteTaxRate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteTaxRate(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["taxRates"] });
    },
  });
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
