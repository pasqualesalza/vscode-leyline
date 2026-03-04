import * as vscode from "vscode";
import type { ProviderConfig } from "./types.js";

function cfg() {
  return vscode.workspace.getConfiguration("leyline");
}

const providerDefaults: Record<string, ProviderConfig> = {
  codestral: {
    endpoint: "https://codestral.mistral.ai",
    model: "codestral-latest",
    maxTokens: 256,
  },
  ollama: {
    endpoint: "http://localhost:11434",
    model: "qwen2.5-coder:7b",
    maxTokens: 256,
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
  const maxTokens = cfg().get<number>(`${name}.maxTokens`, defaults.maxTokens);

  return { endpoint, model, maxTokens };
}

export function enabled(): boolean {
  return cfg().get<boolean>("enabled", true);
}

export async function setEnabled(value: boolean): Promise<void> {
  await cfg().update("enabled", value, vscode.ConfigurationTarget.Global);
}

export function debounceMs(): number {
  return cfg().get<number>("debounceMs", 300);
}

export function prefixLines(): number {
  return cfg().get<number>("prefixLines", 100);
}

export function suffixLines(): number {
  return cfg().get<number>("suffixLines", 30);
}
