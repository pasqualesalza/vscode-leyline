import * as vscode from "vscode";
import type { ProviderConfig } from "./types.js";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cfg() {
  return vscode.workspace.getConfiguration("leyline");
}

const providerDefaults: Record<string, ProviderConfig> = {
  codestral: {
    endpoint: "https://codestral.mistral.ai",
    model: "codestral-latest",
    maxTokens: 256,
    requestTimeoutMs: 30_000,
    stop: ["\n\n"],
  },
  ollama: {
    endpoint: "http://localhost:11434",
    model: "qwen2.5-coder:7b",
    maxTokens: 256,
    requestTimeoutMs: 30_000,
    stop: ["\n\n"],
  },
};

export function provider(): "codestral" | "ollama" {
  return cfg().get<"codestral" | "ollama">("provider", "codestral");
}

export function providerConfig(name: string): ProviderConfig {
  const defaults = providerDefaults[name] ?? providerDefaults.codestral;

  const endpoint =
    cfg().get<string>(`${name}.endpoint`, "") || defaults.endpoint;
  const model = cfg().get<string>(`${name}.model`, "") || defaults.model;
  const maxTokens = clamp(
    cfg().get<number>(`${name}.maxTokens`, defaults.maxTokens),
    1,
    4096,
  );

  const requestTimeoutMs =
    clamp(cfg().get<number>("requestTimeoutMs", 30), 5, 120) * 1000;

  const mode = cfg().get<string>("multiline", "auto");
  const stop = mode === "always" ? [] : mode === "never" ? ["\n"] : ["\n\n"];

  return { endpoint, model, maxTokens, requestTimeoutMs, stop };
}

export function enabled(): boolean {
  return cfg().get<boolean>("enabled", true);
}

export async function setEnabled(value: boolean): Promise<void> {
  await cfg().update("enabled", value, vscode.ConfigurationTarget.Global);
}

export function debounceMs(): number {
  return clamp(cfg().get<number>("debounceMs", 300), 0, 5000);
}

export function prefixLines(): number {
  return clamp(cfg().get<number>("prefixLines", 100), 1, 500);
}

export function suffixLines(): number {
  return clamp(cfg().get<number>("suffixLines", 30), 0, 500);
}

export function tabOverride(): boolean {
  return cfg().get<boolean>("tabOverride", true);
}

export function enabledForLanguage(languageId: string): boolean {
  if (!enabled()) return false;
  const map = cfg().get<Record<string, boolean>>("enable", { "*": true });
  if (languageId in map) return map[languageId];
  return map["*"] ?? true;
}

export function disableInFiles(): string[] {
  return cfg().get<string[]>("disableInFiles", []);
}

export function cacheSize(): number {
  return clamp(cfg().get<number>("cacheSize", 50), 0, 500);
}

export function treeSitter(): boolean {
  return cfg().get<boolean>("treeSitter", false);
}
