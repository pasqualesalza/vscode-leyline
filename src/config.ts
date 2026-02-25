import * as vscode from "vscode";

function cfg() {
  return vscode.workspace.getConfiguration("leyline");
}

export function provider(): "azure-openai" | "openai" {
  return cfg().get<"azure-openai" | "openai">("provider", "azure-openai");
}

export function endpoint(): string {
  return cfg().get<string>("endpoint", "");
}

export function deployment(): string {
  return cfg().get<string>("deployment", "gpt-5.1-codex-mini");
}

export function apiVersion(): string {
  return cfg().get<string>("apiVersion", "2024-06-01");
}

export function model(): string {
  return cfg().get<string>("model", "gpt-4o");
}

export function enabled(): boolean {
  return cfg().get<boolean>("enabled", true);
}

export async function setEnabled(value: boolean): Promise<void> {
  await cfg().update("enabled", value, vscode.ConfigurationTarget.Global);
}

export function maxTokens(): number {
  return cfg().get<number>("maxTokens", 256);
}

export function temperature(): number {
  return cfg().get<number>("temperature", 0);
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
