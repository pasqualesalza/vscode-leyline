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
    stopOverride?: string[],
  ): Promise<string | null> {
    const apiKey = await this.getApiKey();

    const ep = this.config.endpoint.replace(/\/+$/, "");
    const url = `${ep}/api/generate`;

    const body = {
      model: this.config.model,
      prompt: prefix,
      suffix,
      stream: true,
      options: {
        num_predict: this.config.maxTokens,
        stop: stopOverride ?? this.config.stop,
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const timeoutSignal = AbortSignal.any([
      signal,
      AbortSignal.timeout(this.config.requestTimeoutMs),
    ]);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: timeoutSignal,
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`,
      );
    }

    return readJSONL(response, signal);
  }
}

/** Collect an Ollama JSONL stream into a single completion string. */
async function readJSONL(
  response: Response,
  signal: AbortSignal,
): Promise<string | null> {
  const body = response.body;
  if (!body) return null;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let buffer = "";

  try {
    outer: while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as {
            response?: string;
            done?: boolean;
          };
          if (parsed.response) chunks.push(parsed.response);
          if (parsed.done) break outer;
        } catch {
          // Skip malformed JSONL line
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }

  return chunks.length > 0 ? chunks.join("") : null;
}
