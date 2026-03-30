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
    stopOverride?: string[],
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
      stop: stopOverride ?? this.config.stop,
      stream: true,
    };

    const timeoutSignal = AbortSignal.any([
      signal,
      AbortSignal.timeout(this.config.requestTimeoutMs),
    ]);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: timeoutSignal,
    });

    if (!response.ok) {
      throw new Error(
        `Codestral API error: ${response.status} ${response.statusText}`,
      );
    }

    return readSSE(response, signal);
  }
}

/** Collect an SSE stream into a single completion string. */
async function readSSE(
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
      // Keep incomplete last line in buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") break outer;

        try {
          const parsed = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) chunks.push(content);
        } catch {
          // Skip malformed SSE line
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }

  return chunks.length > 0 ? chunks.join("") : null;
}
