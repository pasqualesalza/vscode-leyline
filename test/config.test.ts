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

import {
  cacheSize,
  debounceMs,
  disableInFiles,
  enabledForLanguage,
  prefixLines,
  providerConfig,
  suffixLines,
  tabOverride,
  treeSitter,
} from "../src/config.js";

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
      requestTimeoutMs: 30_000,
      stop: ["\n\n"],
    });
  });

  it("returns ollama defaults when no settings configured", () => {
    const cfg = providerConfig("ollama");
    expect(cfg).toEqual({
      endpoint: "http://localhost:11434",
      model: "qwen2.5-coder:7b",
      maxTokens: 256,
      requestTimeoutMs: 30_000,
      stop: ["\n\n"],
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

describe("numeric clamping", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("debounceMs: clamps negative to 0", () => {
    getMock.mockImplementation((key: string) => {
      if (key === "debounceMs") return -100;
    });
    expect(debounceMs()).toBe(0);
  });

  it("debounceMs: clamps above max to 5000", () => {
    getMock.mockImplementation((key: string) => {
      if (key === "debounceMs") return 99999;
    });
    expect(debounceMs()).toBe(5000);
  });

  it("prefixLines: clamps 0 to 1", () => {
    getMock.mockImplementation((key: string) => {
      if (key === "prefixLines") return 0;
    });
    expect(prefixLines()).toBe(1);
  });

  it("prefixLines: clamps above max to 500", () => {
    getMock.mockImplementation((key: string) => {
      if (key === "prefixLines") return 1000;
    });
    expect(prefixLines()).toBe(500);
  });

  it("suffixLines: clamps negative to 0", () => {
    getMock.mockImplementation((key: string) => {
      if (key === "suffixLines") return -1;
    });
    expect(suffixLines()).toBe(0);
  });

  it("suffixLines: clamps above max to 500", () => {
    getMock.mockImplementation((key: string) => {
      if (key === "suffixLines") return 1000;
    });
    expect(suffixLines()).toBe(500);
  });

  it("providerConfig().maxTokens: clamps 0 to 1", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "codestral.maxTokens") return 0;
      return defaultValue;
    });
    expect(providerConfig("codestral").maxTokens).toBe(1);
  });

  it("providerConfig().maxTokens: clamps above max to 4096", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "codestral.maxTokens") return 10000;
      return defaultValue;
    });
    expect(providerConfig("codestral").maxTokens).toBe(4096);
  });

  it("providerConfig().requestTimeoutMs: clamps below min to 5000ms", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "requestTimeoutMs") return 1;
      return defaultValue;
    });
    expect(providerConfig("codestral").requestTimeoutMs).toBe(5000);
  });

  it("providerConfig().requestTimeoutMs: clamps above max to 120000ms", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "requestTimeoutMs") return 999;
      return defaultValue;
    });
    expect(providerConfig("codestral").requestTimeoutMs).toBe(120_000);
  });

  it("providerConfig().stop: defaults to double newline", () => {
    getMock.mockImplementation(
      (_key: string, defaultValue: unknown) => defaultValue,
    );
    expect(providerConfig("codestral").stop).toEqual(["\n\n"]);
  });

  it("providerConfig().stop: always mode returns empty array", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "multiline") return "always";
      return defaultValue;
    });
    expect(providerConfig("codestral").stop).toEqual([]);
  });

  it("providerConfig().stop: never mode returns single newline", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "multiline") return "never";
      return defaultValue;
    });
    expect(providerConfig("codestral").stop).toEqual(["\n"]);
  });
});

describe("tabOverride", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("defaults to true", () => {
    getMock.mockImplementation(
      (_key: string, defaultValue: unknown) => defaultValue,
    );
    expect(tabOverride()).toBe(true);
  });

  it("returns false when set to false", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "tabOverride") return false;
      return defaultValue;
    });
    expect(tabOverride()).toBe(false);
  });
});

describe("enabledForLanguage", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("returns true by default for any language", () => {
    getMock.mockImplementation(
      (_key: string, defaultValue: unknown) => defaultValue,
    );
    expect(enabledForLanguage("typescript")).toBe(true);
    expect(enabledForLanguage("python")).toBe(true);
  });

  it("returns false for disabled language", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "enable") return { "*": true, markdown: false };
      return defaultValue;
    });
    expect(enabledForLanguage("markdown")).toBe(false);
    expect(enabledForLanguage("typescript")).toBe(true);
  });

  it("uses * as fallback", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "enable") return { "*": false, python: true };
      return defaultValue;
    });
    expect(enabledForLanguage("python")).toBe(true);
    expect(enabledForLanguage("java")).toBe(false);
  });

  it("returns false when global enabled is false", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "enabled") return false;
      if (key === "enable") return { "*": true };
      return defaultValue;
    });
    expect(enabledForLanguage("typescript")).toBe(false);
  });
});

describe("disableInFiles", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("defaults to empty array", () => {
    getMock.mockImplementation(
      (_key: string, defaultValue: unknown) => defaultValue,
    );
    expect(disableInFiles()).toEqual([]);
  });

  it("returns configured patterns", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "disableInFiles") return ["**/*.md", "**/secrets/**"];
      return defaultValue;
    });
    expect(disableInFiles()).toEqual(["**/*.md", "**/secrets/**"]);
  });
});

describe("cacheSize", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("defaults to 50", () => {
    getMock.mockImplementation(
      (_key: string, defaultValue: unknown) => defaultValue,
    );
    expect(cacheSize()).toBe(50);
  });

  it("clamps negative to 0", () => {
    getMock.mockImplementation((key: string) => {
      if (key === "cacheSize") return -10;
    });
    expect(cacheSize()).toBe(0);
  });

  it("clamps above max to 500", () => {
    getMock.mockImplementation((key: string) => {
      if (key === "cacheSize") return 9999;
    });
    expect(cacheSize()).toBe(500);
  });
});

describe("treeSitter", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("defaults to false", () => {
    getMock.mockImplementation(
      (_key: string, defaultValue: unknown) => defaultValue,
    );
    expect(treeSitter()).toBe(false);
  });

  it("returns true when enabled", () => {
    getMock.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === "treeSitter") return true;
      return defaultValue;
    });
    expect(treeSitter()).toBe(true);
  });
});
