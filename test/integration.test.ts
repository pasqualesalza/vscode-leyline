import { describe, expect, it } from "vitest";
import { OllamaProvider } from "../src/providers/ollama.js";
import type { ProviderConfig } from "../src/types.js";

const ollamaConfig: ProviderConfig = {
  endpoint:
    process.env.LEYLINE_TEST_OLLAMA_ENDPOINT || "http://localhost:11434",
  model: process.env.LEYLINE_TEST_OLLAMA_MODEL || "qwen2.5-coder:1.5b",
  maxTokens: 64,
};

describe.skipIf(!process.env.LEYLINE_TEST_OLLAMA)(
  "OllamaProvider (integration)",
  { timeout: 30_000 },
  () => {
    it("returns a non-empty completion", async () => {
      const provider = new OllamaProvider(async () => undefined, ollamaConfig);
      const result = await provider.complete(
        "function add(a, b) {\n  return ",
        ";\n}",
        "typescript",
        new AbortController().signal,
      );
      expect(result).toBeTypeOf("string");
      expect(result?.length).toBeGreaterThan(0);
    });

    it("respects abort signal", async () => {
      const provider = new OllamaProvider(async () => undefined, ollamaConfig);
      const controller = new AbortController();
      controller.abort();
      await expect(
        provider.complete("const x = ", ";", "typescript", controller.signal),
      ).rejects.toThrow();
    });
  },
);
