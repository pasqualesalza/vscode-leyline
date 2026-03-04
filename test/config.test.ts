import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: getMock,
    }),
  },
  ConfigurationTarget: { Global: 1 },
}));

import { providerConfig } from "../src/config.js";

describe("providerConfig", () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockImplementation(
      (_key: string, defaultValue: unknown) => defaultValue,
    );
  });

  it("returns codestral defaults when no settings configured", () => {
    const cfg = providerConfig("codestral");
    expect(cfg).toEqual({
      endpoint: "https://codestral.mistral.ai",
      model: "codestral-latest",
      maxTokens: 256,
    });
  });

  it("returns ollama defaults when no settings configured", () => {
    const cfg = providerConfig("ollama");
    expect(cfg).toEqual({
      endpoint: "http://localhost:11434",
      model: "qwen2.5-coder:7b",
      maxTokens: 256,
    });
  });

  it("uses custom endpoint when set", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "codestral.endpoint") return "https://custom.example.com";
      return defaultValue;
    });

    const cfg = providerConfig("codestral");
    expect(cfg.endpoint).toBe("https://custom.example.com");
  });

  it("falls back to default when endpoint is empty string", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "codestral.endpoint") return "";
      return defaultValue;
    });

    const cfg = providerConfig("codestral");
    expect(cfg.endpoint).toBe("https://codestral.mistral.ai");
  });

  it("uses custom model when set", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "ollama.model") return "llama3:8b";
      return defaultValue;
    });

    const cfg = providerConfig("ollama");
    expect(cfg.model).toBe("llama3:8b");
  });

  it("uses custom maxTokens when set", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "codestral.maxTokens") return 512;
      return defaultValue;
    });

    const cfg = providerConfig("codestral");
    expect(cfg.maxTokens).toBe(512);
  });

  it("falls back to codestral defaults for unknown provider", () => {
    const cfg = providerConfig("unknown");
    expect(cfg.maxTokens).toBe(256);
  });
});
