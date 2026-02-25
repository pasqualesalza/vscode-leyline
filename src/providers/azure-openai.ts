import * as config from "../config.js";
import { buildFIMMessages } from "../prompt.js";
import type { CompletionProvider } from "./provider.js";

export class AzureOpenAIProvider implements CompletionProvider {
  readonly name = "azure-openai";
  private readonly getApiKey: () => Promise<string | undefined>;

  constructor(getApiKey: () => Promise<string | undefined>) {
    this.getApiKey = getApiKey;
  }

  async complete(
    prefix: string,
    suffix: string,
    language: string,
    signal: AbortSignal,
  ): Promise<string | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) return null;

    const ep = config.endpoint().replace(/\/+$/, "");
    const dep = config.deployment();
    const ver = config.apiVersion();
    const url = `${ep}/openai/deployments/${dep}/chat/completions?api-version=${ver}`;

    const messages = buildFIMMessages(prefix, suffix, language, "");
    const body = {
      messages,
      max_tokens: config.maxTokens(),
      temperature: config.temperature(),
      stop: ["\n\n"],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Azure OpenAI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  }
}
