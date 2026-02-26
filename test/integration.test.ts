import { describe, expect, it, vi } from "vitest";

vi.mock("../src/config.js", () => ({
  endpoint: () =>
    process.env.LEYLINE_TEST_OLLAMA_ENDPOINT || "http://localhost:11434",
  model: () => process.env.LEYLINE_TEST_OLLAMA_MODEL || "qwen2.5-coder:1.5b",
  maxTokens: () => 64,
}));

import { OllamaProvider } from "../src/providers/ollama.js";

describe.skipIf(!process.env.LEYLINE_TEST_OLLAMA)(
  "OllamaProvider (integration)",
  { timeout: 30_000 },
  () => {
    it("returns a non-empty completion", async () => {
      const provider = new OllamaProvider(async () => undefined);
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
      const provider = new OllamaProvider(async () => undefined);
      const controller = new AbortController();
      controller.abort();
      await expect(
        provider.complete("const x = ", ";", "typescript", controller.signal),
      ).rejects.toThrow();
    });
  },
);
