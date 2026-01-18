import api from "@/services/api";
import type { ApiResponse } from "@/types";

export type StandardProviderId =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "mistral"
  | "gemini"
  | "groq"
  | "cohere"
  | "anyscale"
  | "perplexity"
  | "deepinfra"
  | "together"
  | "alephalpha";

export interface StandardProviderConfig {
  providerKey: StandardProviderId;
  baseUrl: string;
  defaultModel?: string | null;
  models?: string[];
  modelCatalog?: StandardProviderModelItem[];
  enabled: boolean;
  hasKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StandardProviderModelItem {
  id: string;
  type?: string | null;
  multimodal?: boolean | null;
}

export interface CustomProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  models?: string[];
  hasKey: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelProviderListResponse {
  standardProviders: StandardProviderConfig[];
  customProviders: CustomProviderConfig[];
}

export interface UpsertStandardProviderPayload {
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  models?: string[];
  enabled?: boolean;
  clearKey?: boolean;
}

export interface CustomProviderPayload {
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  models?: string[];
  clearKey?: boolean;
  enabled?: boolean;
}

export interface ModelProviderTestPayload {
  providerType: "STANDARD" | "CUSTOM";
  providerKey?: StandardProviderId;
  providerId?: string;
  baseUrl: string;
  apiKey?: string;
  model?: string;
}

export interface ModelProviderTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
}

export interface StandardProviderModelCatalogResponse {
  modelCatalog: StandardProviderModelItem[];
  enabledModels: string[];
}

export const modelHubService = {
  async list() {
    const { data } = await api.get<ApiResponse<ModelProviderListResponse>>(
      "/admin/model-providers"
    );
    return data.data;
  },
  async upsertStandard(providerKey: StandardProviderId, payload: UpsertStandardProviderPayload) {
    const { data } = await api.post<ApiResponse<StandardProviderConfig>>(
      `/admin/model-providers/standard/${providerKey}`,
      payload
    );
    return data.data;
  },
  async refreshStandardModels(
    providerKey: StandardProviderId,
    payload: { baseUrl?: string; apiKey?: string }
  ) {
    const { data } = await api.post<ApiResponse<StandardProviderModelCatalogResponse>>(
      `/admin/model-providers/standard/${providerKey}/models/refresh`,
      payload
    );
    return data.data;
  },
  async deleteStandard(providerKey: StandardProviderId) {
    await api.delete(`/admin/model-providers/standard/${providerKey}`);
  },
  async createCustom(payload: CustomProviderPayload) {
    const { data } = await api.post<ApiResponse<CustomProviderConfig>>(
      "/admin/model-providers/custom",
      payload
    );
    return data.data;
  },
  async updateCustom(id: string, payload: CustomProviderPayload) {
    const { data } = await api.put<ApiResponse<CustomProviderConfig>>(
      `/admin/model-providers/custom/${id}`,
      payload
    );
    return data.data;
  },
  async deleteCustom(id: string) {
    await api.delete(`/admin/model-providers/custom/${id}`);
  },
  async toggleCustom(id: string, enabled: boolean) {
    const { data } = await api.post<ApiResponse<CustomProviderConfig>>(
      `/admin/model-providers/custom/${id}/toggle`,
      undefined,
      { params: { enabled } }
    );
    return data.data;
  },
  async testConnection(payload: ModelProviderTestPayload) {
    const { data } = await api.post<ApiResponse<ModelProviderTestResult>>(
      "/admin/model-providers/test",
      payload
    );
    return data.data;
  },
};
