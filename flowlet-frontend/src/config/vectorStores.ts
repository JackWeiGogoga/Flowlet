export type VectorStoreProviderKey = "milvus" | "qdrant";

export const VECTOR_STORE_PROVIDER_LABELS: Record<VectorStoreProviderKey, string> = {
  milvus: "Milvus",
  qdrant: "Qdrant",
};

export const VECTOR_STORE_PROVIDER_HINTS: Record<VectorStoreProviderKey, string> = {
  milvus: "自建或云托管 Milvus 集群",
  qdrant: "Qdrant Cloud / 自建服务",
};

export const VECTOR_STORE_PROVIDER_COLORS: Record<
  VectorStoreProviderKey,
  string
> = {
  milvus: "#0ea5e9",
  qdrant: "#16a34a",
};
