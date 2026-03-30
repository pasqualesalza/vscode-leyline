import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodestralProvider } from "../src/providers/codestral.js";
import { OllamaProvider } from "../src/providers/ollama.js";
import type { ProviderConfig } from "../src/types.js";

const codestralConfig: ProviderConfig = {
  endpoint: "https://codestral.example.com",
  model: "codestral-latest",
  maxTokens: 256,
  requestTimeoutMs: 30_000,
  stop: ["\n\n"],
};

const ollamaConfig: ProviderConfig = {
  endpoint: "http://localhost:11434",
  model: "qwen2.5-coder:7b",
  maxTokens: 256,
  requestTimeoutMs: 30_000,
  stop: ["\n\n"],
};

/** Create a mock ReadableStream from a string (simulates a streaming body). */
function mockStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

/** Build a mock SSE response body for Codestral streaming. */
function codestralSSE(content: string): ReadableStream<Uint8Array> {
  const lines = [
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`,
    "data: [DONE]",
    "",
  ].join("\n");
  return mockStream(lines);
}

/** Build a mock JSONL response body for Ollama streaming. */
function ollamaJSONL(content: string): ReadableStream<Uint8Array> {
  const lines = [
    JSON.stringify({ response: content, done: false }),
    JSON.stringify({ response: "", done: true }),
    "",
  ].join("\n");
  return mockStream(lines);
}

describe("CodestralProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds correct URL and headers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: codestralSSE("code"),
    });

    const provider = new CodestralProvider(
      async () => "test-key",
      codestralConfig,
    );
    const signal = new AbortController().signal;
    await provider.complete("prefix", "suffix", "typescript", signal);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://codestral.example.com/v1/fim/completions");
    expect(options.headers.Authorization).toBe("Bearer test-key");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("sends prompt and suffix in body (not messages)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: codestralSSE(""),
    });

    const provider = new CodestralProvider(
      async () => "test-key",
      codestralConfig,
    );
    await provider.complete(
      "const x =",
      ";\nconsole.log(x);",
      "typescript",
      new AbortController().signal,
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toBe("const x =");
    expect(body.suffix).toBe(";\nconsole.log(x);");
    expect(body).not.toHaveProperty("messages");
  });

  it("sends max_tokens, stop, and stream: true", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: codestralSSE(""),
    });

    const provider = new CodestralProvider(
      async () => "test-key",
      codestralConfig,
    );
    await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(256);
    expect(body.stop).toEqual(["\n\n"]);
    expect(body.stream).toBe(true);
  });

  it("uses injected endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: codestralSSE("code"),
    });

    const customConfig: ProviderConfig = {
      ...codestralConfig,
      endpoint: "https://custom.example.com",
    };
    const provider = new CodestralProvider(
      async () => "test-key",
      customConfig,
    );
    await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://custom.example.com/v1/fim/completions");
  });

  it("returns completion text from SSE stream", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: codestralSSE("hello world"),
    });

    const provider = new CodestralProvider(
      async () => "test-key",
      codestralConfig,
    );
    const result = await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );
    expect(result).toBe("hello world");
  });

  it("returns null when no API key", async () => {
    const provider = new CodestralProvider(
      async () => undefined,
      codestralConfig,
    );
    const result = await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws on API error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    const provider = new CodestralProvider(
      async () => "test-key",
      codestralConfig,
    );
    await expect(
      provider.complete(
        "prefix",
        "suffix",
        "typescript",
        new AbortController().signal,
      ),
    ).rejects.toThrow("Codestral API error: 401 Unauthorized");
  });

  it("composes a timeout signal with the caller signal", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: codestralSSE("code"),
    });

    const provider = new CodestralProvider(
      async () => "test-key",
      codestralConfig,
    );
    const callerSignal = new AbortController().signal;
    await provider.complete("prefix", "suffix", "typescript", callerSignal);

    const options = fetchMock.mock.calls[0][1];
    expect(options.signal).not.toBe(callerSignal);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("OllamaProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds correct URL with no auth by default", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: ollamaJSONL("completed code"),
    });

    const provider = new OllamaProvider(async () => undefined, ollamaConfig);
    await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:11434/api/generate");
    expect(options.headers).not.toHaveProperty("Authorization");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("adds Bearer auth when key is present", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: ollamaJSONL("code"),
    });

    const provider = new OllamaProvider(async () => "my-token", ollamaConfig);
    await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer my-token");
  });

  it("sends prompt, suffix, stream true, and options.num_predict", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: ollamaJSONL(""),
    });

    const provider = new OllamaProvider(async () => undefined, ollamaConfig);
    await provider.complete(
      "const x =",
      ";\nconsole.log(x);",
      "typescript",
      new AbortController().signal,
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toBe("const x =");
    expect(body.suffix).toBe(";\nconsole.log(x);");
    expect(body.stream).toBe(true);
    expect(body.options.num_predict).toBe(256);
  });

  it("uses injected endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: ollamaJSONL("code"),
    });

    const customConfig: ProviderConfig = {
      ...ollamaConfig,
      endpoint: "http://remote:11434",
    };
    const provider = new OllamaProvider(async () => undefined, customConfig);
    await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("http://remote:11434/api/generate");
  });

  it("returns response from JSONL stream", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: ollamaJSONL("hello world"),
    });

    const provider = new OllamaProvider(async () => undefined, ollamaConfig);
    const result = await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );
    expect(result).toBe("hello world");
  });

  it("does NOT return null when no API key", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: ollamaJSONL("code"),
    });

    const provider = new OllamaProvider(async () => undefined, ollamaConfig);
    const result = await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );
    expect(result).toBe("code");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("throws on API error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const provider = new OllamaProvider(async () => undefined, ollamaConfig);
    await expect(
      provider.complete(
        "prefix",
        "suffix",
        "typescript",
        new AbortController().signal,
      ),
    ).rejects.toThrow("Ollama API error: 500 Internal Server Error");
  });

  it("composes a timeout signal with the caller signal", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: ollamaJSONL("code"),
    });

    const provider = new OllamaProvider(async () => undefined, ollamaConfig);
    const callerSignal = new AbortController().signal;
    await provider.complete("prefix", "suffix", "typescript", callerSignal);

    const options = fetchMock.mock.calls[0][1];
    expect(options.signal).not.toBe(callerSignal);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});
