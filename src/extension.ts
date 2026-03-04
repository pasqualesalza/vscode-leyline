import * as vscode from "vscode";
import { LeylineCompletionProvider } from "./completion-provider.js";
import * as config from "./config.js";
import { CodestralProvider } from "./providers/codestral.js";
import { OllamaProvider } from "./providers/ollama.js";
import type { CompletionProvider } from "./providers/provider.js";
import { getApiKey, initSecretStorage, setApiKey } from "./secret.js";
import { createStatusBar, updateStatusBar } from "./statusbar.js";

let currentProvider: CompletionProvider | undefined;

function buildProvider(): CompletionProvider {
  const name = config.provider();
  const keyGetter = () => getApiKey(name);
  const providerCfg = config.providerConfig(name);

  if (name === "ollama") {
    return new OllamaProvider(keyGetter, providerCfg);
  }
  return new CodestralProvider(keyGetter, providerCfg);
}

export function activate(context: vscode.ExtensionContext): void {
  initSecretStorage(context.secrets);

  currentProvider = buildProvider();
  const statusBar = createStatusBar();
  updateStatusBar(config.enabled() ? "ready" : "disabled", config.provider());

  const completionProvider = new LeylineCompletionProvider(
    () => currentProvider,
  );
  const completionRegistration =
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: "**" },
      completionProvider,
    );

  const setApiKeyCmd = vscode.commands.registerCommand(
    "leyline.setApiKey",
    async () => {
      const providerName = config.provider();
      const providerCfg = config.providerConfig(providerName);
      const key = await vscode.window.showInputBox({
        prompt: `Enter API key for ${providerName} (${providerCfg.endpoint})`,
        password: true,
        placeHolder: "Paste your API key here",
      });
      if (key !== undefined) {
        await setApiKey(providerName, key);
        vscode.window.showInformationMessage(
          `Leyline: API key saved for ${providerName}`,
        );
      }
    },
  );

  const toggleCmd = vscode.commands.registerCommand(
    "leyline.toggle",
    async () => {
      const newValue = !config.enabled();
      await config.setEnabled(newValue);
      updateStatusBar(newValue ? "ready" : "disabled", config.provider());
      if (!newValue) {
        completionProvider.cancel();
      }
    },
  );

  const selectProviderCmd = vscode.commands.registerCommand(
    "leyline.selectProvider",
    async () => {
      const pick = await vscode.window.showQuickPick(
        [
          { label: "Codestral", value: "codestral" },
          { label: "Ollama", value: "ollama" },
        ],
        { placeHolder: "Select a completion provider" },
      );
      if (pick) {
        await vscode.workspace
          .getConfiguration("leyline")
          .update("provider", pick.value, vscode.ConfigurationTarget.Global);
      }
    },
  );

  const showMenuCmd = vscode.commands.registerCommand(
    "leyline.showMenu",
    async () => {
      const isEnabled = config.enabled();
      const current = config.provider();
      const items = [
        {
          label: isEnabled ? "$(circle-slash) Disable" : "$(check) Enable",
          description: "Inline completion",
          action: "toggle" as const,
        },
        {
          label: "$(server) Switch Provider",
          description: `Current: ${current}`,
          action: "selectProvider" as const,
        },
        {
          label: "$(key) Set API Key",
          description: `For ${current}`,
          action: "setApiKey" as const,
        },
      ];
      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: "Leyline",
      });
      if (pick) await vscode.commands.executeCommand(`leyline.${pick.action}`);
    },
  );

  const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("leyline")) {
      currentProvider = buildProvider();
      updateStatusBar(
        config.enabled() ? "ready" : "disabled",
        config.provider(),
      );
    }
  });

  context.subscriptions.push(
    statusBar,
    completionRegistration,
    setApiKeyCmd,
    toggleCmd,
    selectProviderCmd,
    showMenuCmd,
    configListener,
    { dispose: () => completionProvider.dispose() },
  );
}

export function deactivate(): void {}
