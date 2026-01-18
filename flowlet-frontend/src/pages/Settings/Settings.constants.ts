import type { StandardProviderId } from "@/store/modelHubStore";
import type { StandardProviderConfig } from "@/services/modelHubService";
import IconMap from "@/components/LLMIcons";
import {
  STANDARD_PROVIDER_LABELS,
  STANDARD_PROVIDER_ICON_KEYS,
} from "@/config/llmProviders";

export type StandardProvider = {
  id: StandardProviderId;
  name: string;
  hint: string;
  baseUrl: string;
  color: string;
  initial: string;
  iconKey?: string;
};

export const ICON_ORDER = Object.keys(IconMap);

export const STANDARD_PROVIDERS: StandardProvider[] = [
  {
    id: "openai",
    name: STANDARD_PROVIDER_LABELS.openai,
    hint: "官方 API / GPT-4o / GPT-4.1",
    baseUrl: "https://api.openai.com/v1",
    color: "#0ea5e9",
    initial: "O",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.openai,
  },
  {
    id: "groq",
    name: STANDARD_PROVIDER_LABELS.groq,
    hint: "高速推理 / OpenAI 兼容",
    baseUrl: "https://api.groq.com/openai/v1",
    color: "#22c55e",
    initial: "G",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.groq,
  },
  {
    id: "anthropic",
    name: STANDARD_PROVIDER_LABELS.anthropic,
    hint: "Claude 3.x / Claude 3.5",
    baseUrl: "https://api.anthropic.com",
    color: "#0f766e",
    initial: "C",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.anthropic,
  },
  {
    id: "openrouter",
    name: STANDARD_PROVIDER_LABELS.openrouter,
    hint: "多模型聚合 / 路由选择",
    baseUrl: "https://openrouter.ai/api/v1",
    color: "#111827",
    initial: "R",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.openrouter,
  },
  {
    id: "cohere",
    name: STANDARD_PROVIDER_LABELS.cohere,
    hint: "Command / Embed / Rerank",
    baseUrl: "https://api.cohere.ai/v1",
    color: "#14b8a6",
    initial: "C",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.cohere,
  },
  {
    id: "anyscale",
    name: STANDARD_PROVIDER_LABELS.anyscale,
    hint: "Ray / OpenAI 兼容",
    baseUrl: "https://api.endpoints.anyscale.com/v1",
    color: "#6366f1",
    initial: "A",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.anyscale,
  },
  {
    id: "mistral",
    name: STANDARD_PROVIDER_LABELS.mistral,
    hint: "Mistral / Mixtral 系列",
    baseUrl: "https://api.mistral.ai/v1",
    color: "#f97316",
    initial: "M",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.mistral,
  },
  {
    id: "gemini",
    name: STANDARD_PROVIDER_LABELS.gemini,
    hint: "Gemini 1.5 / 2.0",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    color: "#6366f1",
    initial: "G",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.gemini,
  },
  {
    id: "perplexity",
    name: STANDARD_PROVIDER_LABELS.perplexity,
    hint: "PPLX / OpenAI 兼容",
    baseUrl: "https://api.perplexity.ai",
    color: "#0ea5e9",
    initial: "P",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.perplexity,
  },
  {
    id: "deepinfra",
    name: STANDARD_PROVIDER_LABELS.deepinfra,
    hint: "开源模型托管 / OpenAI 兼容",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    color: "#475569",
    initial: "D",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.deepinfra,
  },
  {
    id: "together",
    name: STANDARD_PROVIDER_LABELS.together,
    hint: "开源模型 / OpenAI 兼容",
    baseUrl: "https://api.together.xyz/v1",
    color: "#8b5cf6",
    initial: "T",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.together,
  },
  {
    id: "alephalpha",
    name: STANDARD_PROVIDER_LABELS.alephalpha,
    hint: "Luminous 系列",
    baseUrl: "https://api.aleph-alpha.com/v1",
    color: "#f59e0b",
    initial: "A",
    iconKey: STANDARD_PROVIDER_ICON_KEYS.alephalpha,
  },
];

export const MODEL_TYPE_LABELS: Record<string, string> = {
  text: "文本",
  multimodal: "多模态",
  embedding: "Embedding",
  image: "图像",
  audio: "音频",
  unknown: "其他",
};

export const buildStandardRows = (
  providers: StandardProvider[],
  standardConfigs: Partial<Record<StandardProviderId, StandardProviderConfig>>
) =>
  providers.map((provider) => {
    const config = standardConfigs[provider.id];
    return {
      ...provider,
      status: config?.enabled ?? false,
      updatedAt: config?.updatedAt,
      createdAt: config?.createdAt,
      configured: !!config?.hasKey,
      config,
    };
  });
