import { create } from "zustand";
import {
  vectorStoreService,
  type VectorStoreProviderConfig,
  type VectorStoreProviderPayload,
} from "@/services/vectorStoreService";

export type { VectorStoreProviderConfig, VectorStoreProviderPayload };

interface VectorStoreState {
  providers: VectorStoreProviderConfig[];
  loading: boolean;
  fetchProviders: () => Promise<void>;
  createProvider: (payload: VectorStoreProviderPayload) => Promise<void>;
  updateProvider: (id: string, payload: VectorStoreProviderPayload) => Promise<void>;
  toggleProvider: (id: string, enabled: boolean) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
}

export const useVectorStoreStore = create<VectorStoreState>((set, get) => ({
  providers: [],
  loading: false,
  fetchProviders: async () => {
    set({ loading: true });
    try {
      const data = await vectorStoreService.list();
      set({ providers: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  createProvider: async (payload) => {
    const created = await vectorStoreService.create(payload);
    set({ providers: [...get().providers, created] });
  },
  updateProvider: async (id, payload) => {
    const updated = await vectorStoreService.update(id, payload);
    set({
      providers: get().providers.map((provider) =>
        provider.id === id ? updated : provider
      ),
    });
  },
  toggleProvider: async (id, enabled) => {
    const updated = await vectorStoreService.toggle(id, enabled);
    set({
      providers: get().providers.map((provider) =>
        provider.id === id ? updated : provider
      ),
    });
  },
  removeProvider: async (id) => {
    await vectorStoreService.delete(id);
    set({ providers: get().providers.filter((provider) => provider.id !== id) });
  },
}));
