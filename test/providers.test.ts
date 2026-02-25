import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/config.js", () => ({
  endpoint: () => "https://my-resource.openai.azure.com",
  deployment: () => "gpt-5.1-codex-mini",
  apiVersion: () => "2024-06-01",
  model: () => "gpt-4o",
  maxTokens: () => 256,
  temperature: () => 0,
}));

import { AzureOpenAIProvider } from "../src/providers/azure-openai.js";
import { OpenAIProvider } from "../src/providers/openai.js";

describe("AzureOpenAIProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds correct URL and headers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "completed code" } }],
      }),
    });

    const provider = new AzureOpenAIProvider(async () => "test-key");
    const signal = new AbortController().signal;
    await provider.complete("prefix", "suffix", "typescript", signal);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://my-resource.openai.azure.com/openai/deployments/gpt-5.1-codex-mini/chat/completions?api-version=2024-06-01",
    );
    expect(options.headers["api-key"]).toBe("test-key");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("returns completion text", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "hello world" } }],
      }),
    });

    const provider = new AzureOpenAIProvider(async () => "test-key");
    const result = await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );
    expect(result).toBe("hello world");
  });

  it("returns null when no API key", async () => {
    const provider = new AzureOpenAIProvider(async () => undefined);
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

    const provider = new AzureOpenAIProvider(async () => "test-key");
    await expect(
      provider.complete(
        "prefix",
        "suffix",
        "typescript",
        new AbortController().signal,
      ),
    ).rejects.toThrow("Azure OpenAI API error: 401 Unauthorized");
  });

  it("sends body with stop sequences", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "" } }] }),
    });

    const provider = new AzureOpenAIProvider(async () => "test-key");
    await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.stop).toEqual(["\n\n"]);
    expect(body.max_tokens).toBe(256);
    expect(body.temperature).toBe(0);
  });
});

describe("OpenAIProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds correct URL and headers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "completed code" } }],
      }),
    });

    const provider = new OpenAIProvider(async () => "sk-test");
    await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://my-resource.openai.azure.com/chat/completions");
    expect(options.headers.Authorization).toBe("Bearer sk-test");
  });

  it("includes model in body", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "" } }] }),
    });

    const provider = new OpenAIProvider(async () => "sk-test");
    await provider.complete(
      "prefix",
      "suffix",
      "typescript",
      new AbortController().signal,
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("gpt-4o");
  });

  it("returns null when no API key", async () => {
    const provider = new OpenAIProvider(async () => undefined);
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
      status: 429,
      statusText: "Too Many Requests",
    });

    const provider = new OpenAIProvider(async () => "sk-test");
    await expect(
      provider.complete(
        "prefix",
        "suffix",
        "typescript",
        new AbortController().signal,
      ),
    ).rejects.toThrow("OpenAI API error: 429 Too Many Requests");
  });
});
