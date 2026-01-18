import api from "@/services/api";
import type { ApiResponse } from "@/types";
import type { VectorStoreProviderKey } from "@/config/vectorStores";

export interface VectorStoreProviderConfig {
  id: string;
  name: string;
  providerKey: VectorStoreProviderKey;
  baseUrl: string;
  database?: string | null;
  grpcUrl?: string | null;
  preferGrpc?: boolean | null;
  hasKey: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VectorStoreProviderPayload {
  name: string;
  providerKey: VectorStoreProviderKey;
  baseUrl: string;
  apiKey?: string;
  database?: string;
  grpcUrl?: string;
  preferGrpc?: boolean;
  enabled?: boolean;
  clearKey?: boolean;
}

// Management API types
export interface TestConnectionRequest {
  provider: {
    type: VectorStoreProviderKey;
    base_url: string;
    api_key?: string;
  };
  database?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  databases?: string[];
  collections?: string[];
}

export interface ListDatabasesRequest {
  provider: {
    type: VectorStoreProviderKey;
    base_url: string;
    api_key?: string;
  };
}

export interface ListDatabasesResponse {
  success: boolean;
  databases: string[];
  message?: string;
}

export interface ListCollectionsRequest {
  provider: {
    type: VectorStoreProviderKey;
    base_url: string;
    api_key?: string;
  };
  database?: string;
}

export interface ListCollectionsResponse {
  success: boolean;
  collections: string[];
}

export interface CreateCollectionRequest {
  provider: {
    type: VectorStoreProviderKey;
    baseUrl: string;
    apiKey?: string;
    database?: string;
  };
  collection: string;
  dimension: number;
  metricType?: "COSINE" | "L2" | "IP";
  database?: string;
}

export interface CreateCollectionResponse {
  success: boolean;
  collection: string;
  message?: string;
}

export const vectorStoreService = {
  async list() {
    const { data } = await api.get<
      ApiResponse<VectorStoreProviderConfig[]>
    >("/admin/vector-stores");
    return data.data;
  },
  async create(payload: VectorStoreProviderPayload) {
    const { data } = await api.post<ApiResponse<VectorStoreProviderConfig>>(
      "/admin/vector-stores",
      payload
    );
    return data.data;
  },
  async update(id: string, payload: VectorStoreProviderPayload) {
    const { data } = await api.put<ApiResponse<VectorStoreProviderConfig>>(
      `/admin/vector-stores/${id}`,
      payload
    );
    return data.data;
  },
  async delete(id: string) {
    await api.delete(`/admin/vector-stores/${id}`);
  },
  async toggle(id: string, enabled: boolean) {
    const { data } = await api.post<ApiResponse<VectorStoreProviderConfig>>(
      `/admin/vector-stores/${id}/toggle`,
      undefined,
      { params: { enabled } }
    );
    return data.data;
  },

  // Management APIs - 使用统一的 ApiResponse 格式
  async testConnection(payload: TestConnectionRequest) {
    const { data } = await api.post<ApiResponse<TestConnectionResponse>>(
      "/vector-stores/test-connection",
      payload
    );
    return data.data;
  },

  async listDatabases(payload: ListDatabasesRequest) {
    const { data } = await api.post<ApiResponse<ListDatabasesResponse>>(
      "/vector-stores/list-databases",
      payload
    );
    return data.data;
  },

  async listCollections(payload: ListCollectionsRequest) {
    const { data } = await api.post<ApiResponse<ListCollectionsResponse>>(
      "/vector-stores/list-collections",
      payload
    );
    return data.data;
  },

  async createCollection(payload: CreateCollectionRequest) {
    const { data } = await api.post<ApiResponse<CreateCollectionResponse>>(
      "/vector-stores/create-collection",
      payload
    );
    return data.data;
  },
};

// 导出便捷方法
export const listCollections = vectorStoreService.listCollections.bind(vectorStoreService);
export const createCollection = vectorStoreService.createCollection.bind(vectorStoreService);
