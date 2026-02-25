import type * as vscode from "vscode";

let storage: vscode.SecretStorage | undefined;

export function initSecretStorage(secretStorage: vscode.SecretStorage): void {
  storage = secretStorage;
}

function keyFor(provider: string): string {
  return `leyline.apiKey.${provider}`;
}

export async function getApiKey(provider: string): Promise<string | undefined> {
  return storage?.get(keyFor(provider));
}

export async function setApiKey(provider: string, key: string): Promise<void> {
  await storage?.store(keyFor(provider), key);
}

export async function deleteApiKey(provider: string): Promise<void> {
  await storage?.delete(keyFor(provider));
}
