import { create } from "zustand";
import {
  CustomProviderConfig,
  StandardProviderConfig,
  StandardProviderId,
  modelHubService,
} from "@/services/modelHubService";

export type {
  CustomProviderConfig,
  StandardProviderConfig,
  StandardProviderId,
};

interface ModelHubState {
  standardConfigs: Partial<Record<StandardProviderId, StandardProviderConfig>>;
  customProviders: CustomProviderConfig[];
  loading: boolean;
  fetchProviders: () => Promise<void>;
  saveStandard: (payload: {
    providerKey: StandardProviderId;
    baseUrl: string;
    apiKey?: string;
    defaultModel?: string;
    models?: string[];
    enabled?: boolean;
    clearKey?: boolean;
  }) => Promise<void>;
  removeStandard: (providerKey: StandardProviderId) => Promise<void>;
  toggleStandard: (
    providerKey: StandardProviderId,
    enabled: boolean
  ) => Promise<void>;
  addCustomProvider: (payload: {
    name: string;
    baseUrl: string;
    apiKey?: string;
    model: string;
    models?: string[];
    clearKey?: boolean;
    enabled?: boolean;
  }) => Promise<void>;
  updateCustomProvider: (
    id: string,
    payload: {
      name: string;
      baseUrl: string;
      apiKey?: string;
      model: string;
      models?: string[];
      clearKey?: boolean;
      enabled?: boolean;
    }
  ) => Promise<void>;
  toggleCustomProvider: (id: string, enabled: boolean) => Promise<void>;
  removeCustomProvider: (id: string) => Promise<void>;
}

export const useModelHubStore = create<ModelHubState>((set, get) => ({
  standardConfigs: {},
  customProviders: [],
  loading: false,
  fetchProviders: async () => {
    set({ loading: true });
    try {
      const data = await modelHubService.list();
      const standardConfigs = data.standardProviders.reduce((acc, provider) => {
        acc[provider.providerKey] = provider;
        return acc;
      }, {} as Record<StandardProviderId, StandardProviderConfig>);
      set({
        standardConfigs,
        customProviders: data.customProviders,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },
  saveStandard: async (payload) => {
    const updated = await modelHubService.upsertStandard(payload.providerKey, {
      baseUrl: payload.baseUrl,
      apiKey: payload.apiKey,
      defaultModel: payload.defaultModel,
      enabled: payload.enabled,
      clearKey: payload.clearKey,
    });
    set({
      standardConfigs: {
        ...get().standardConfigs,
        [updated.providerKey]: updated,
      },
    });
  },
  removeStandard: async (providerKey) => {
    await modelHubService.deleteStandard(providerKey);
    const nextConfigs = { ...get().standardConfigs };
    delete nextConfigs[providerKey];
    set({ standardConfigs: nextConfigs });
  },
  toggleStandard: async (providerKey, enabled) => {
    const current = get().standardConfigs[providerKey];
    if (!current) {
      return;
    }
    const updated = await modelHubService.upsertStandard(providerKey, {
      baseUrl: current.baseUrl,
      defaultModel: current.defaultModel ?? undefined,
      enabled,
    });
    set({
      standardConfigs: {
        ...get().standardConfigs,
        [providerKey]: updated,
      },
    });
  },
  addCustomProvider: async (payload) => {
    const created = await modelHubService.createCustom(payload);
    set({ customProviders: [...get().customProviders, created] });
  },
  updateCustomProvider: async (id, payload) => {
    const updated = await modelHubService.updateCustom(id, payload);
    set({
      customProviders: get().customProviders.map((provider) =>
        provider.id === id ? updated : provider
      ),
    });
  },
  toggleCustomProvider: async (id, enabled) => {
    const updated = await modelHubService.toggleCustom(id, enabled);
    set({
      customProviders: get().customProviders.map((provider) =>
        provider.id === id ? updated : provider
      ),
    });
  },
  removeCustomProvider: async (id) => {
    await modelHubService.deleteCustom(id);
    set({
      customProviders: get().customProviders.filter(
        (provider) => provider.id !== id
      ),
    });
  },
}));
