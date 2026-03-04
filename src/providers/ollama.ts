import type { ProviderConfig } from "../types.js";
import type { CompletionProvider } from "./provider.js";

export class OllamaProvider implements CompletionProvider {
  readonly name = "ollama";
  private readonly getApiKey: () => Promise<string | undefined>;
  private readonly config: ProviderConfig;

  constructor(
    getApiKey: () => Promise<string | undefined>,
    config: ProviderConfig,
  ) {
    this.getApiKey = getApiKey;
    this.config = config;
  }

  async complete(
    prefix: string,
    suffix: string,
    _language: string,
    signal: AbortSignal,
  ): Promise<string | null> {
    const apiKey = await this.getApiKey();

    const ep = this.config.endpoint.replace(/\/+$/, "");
    const url = `${ep}/api/generate`;

    const body = {
      model: this.config.model,
      prompt: prefix,
      suffix,
      stream: false,
      options: {
        num_predict: this.config.maxTokens,
        stop: ["\n\n"],
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { response?: string };
    return data.response ?? null;
  }
}
