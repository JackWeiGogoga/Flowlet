import type { StandardProviderId } from "@/store/modelHubStore";

export const STANDARD_PROVIDER_LABELS: Record<StandardProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Claude (Anthropic)",
  openrouter: "OpenRouter",
  mistral: "Mistral",
  gemini: "Google Gemini",
  groq: "Groq",
  cohere: "Cohere",
  anyscale: "Anyscale",
  perplexity: "Perplexity AI",
  deepinfra: "DeepInfra",
  together: "Together AI",
  alephalpha: "Aleph Alpha",
};

export const STANDARD_PROVIDER_ICON_KEYS: Record<StandardProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  mistral: "Mistral AI",
  gemini: "Google Gemini",
  groq: "Groq",
  cohere: "Cohere",
  anyscale: "Anyscale",
  perplexity: "Perplexity AI",
  deepinfra: "DeepInfra",
  together: "Together AI",
  alephalpha: "Aleph Alpha",
};

export const STANDARD_PROVIDER_COLORS: Record<StandardProviderId, string> = {
  openai: "#111827",
  anthropic: "#0f766e",
  openrouter: "#111827",
  mistral: "#f97316",
  gemini: "#6366f1",
  groq: "#0f172a",
  cohere: "#f97316",
  anyscale: "#6366f1",
  perplexity: "#0f172a",
  deepinfra: "#475569",
  together: "#0ea5e9",
  alephalpha: "#f59e0b",
};
