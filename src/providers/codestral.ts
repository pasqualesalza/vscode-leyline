import type { ProviderConfig } from "../types.js";
import type { CompletionProvider } from "./provider.js";

export class CodestralProvider implements CompletionProvider {
  readonly name = "codestral";
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
    if (!apiKey) return null;

    const ep = this.config.endpoint.replace(/\/+$/, "");
    const url = `${ep}/v1/fim/completions`;

    const body = {
      model: this.config.model,
      prompt: prefix,
      suffix,
      max_tokens: this.config.maxTokens,
      stop: ["\n\n"],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Codestral API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  }
}
