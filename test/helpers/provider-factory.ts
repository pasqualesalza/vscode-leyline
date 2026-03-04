import { CodestralProvider } from "../../src/providers/codestral.js";
import { OllamaProvider } from "../../src/providers/ollama.js";
import type { CompletionProvider } from "../../src/providers/provider.js";
import type { ProviderConfig } from "../../src/types.js";

export const providerName =
  process.env.LEYLINE_TEST_FIM_PROVIDER || "codestral";
const apiKey = process.env.LEYLINE_TEST_FIM_KEY || "";

const defaults: Record<string, { endpoint: string; model: string }> = {
  codestral: {
    endpoint: "https://codestral.mistral.ai",
    model: "codestral-latest",
  },
  ollama: {
    endpoint: "http://localhost:11434",
    model: "codellama:7b-code",
  },
};

const providerDefaults = defaults[providerName] ?? defaults.codestral;

export const config: ProviderConfig = {
  endpoint: process.env.LEYLINE_TEST_FIM_ENDPOINT || providerDefaults.endpoint,
  model: process.env.LEYLINE_TEST_FIM_MODEL || providerDefaults.model,
  maxTokens: 128,
};

export function makeProvider(): CompletionProvider {
  const getApiKey = async () => apiKey || undefined;
  switch (providerName) {
    case "ollama":
      return new OllamaProvider(getApiKey, config);
    default:
      return new CodestralProvider(getApiKey, config);
  }
}
