import * as vscode from "vscode";
import { LeylineCompletionProvider } from "./completion-provider.js";
import * as config from "./config.js";
import { AzureOpenAIProvider } from "./providers/azure-openai.js";
import { OpenAIProvider } from "./providers/openai.js";
import type { CompletionProvider } from "./providers/provider.js";
import { getApiKey, initSecretStorage, setApiKey } from "./secret.js";
import { createStatusBar, updateStatusBar } from "./statusbar.js";

let currentProvider: CompletionProvider | undefined;

function buildProvider(): CompletionProvider {
  const name = config.provider();
  const keyGetter = () => getApiKey(name);

  if (name === "openai") {
    return new OpenAIProvider(keyGetter);
  }
  return new AzureOpenAIProvider(keyGetter);
}

export function activate(context: vscode.ExtensionContext): void {
  initSecretStorage(context.secrets);

  currentProvider = buildProvider();
  const statusBar = createStatusBar();
  updateStatusBar(config.enabled() ? "ready" : "disabled");

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
      const key = await vscode.window.showInputBox({
        prompt: `Enter API key for ${providerName}`,
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
      updateStatusBar(newValue ? "ready" : "disabled");
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
          { label: "Azure OpenAI", value: "azure-openai" },
          { label: "OpenAI", value: "openai" },
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

  const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("leyline")) {
      currentProvider = buildProvider();
      updateStatusBar(config.enabled() ? "ready" : "disabled");
    }
  });

  context.subscriptions.push(
    statusBar,
    completionRegistration,
    setApiKeyCmd,
    toggleCmd,
    selectProviderCmd,
    configListener,
    { dispose: () => completionProvider.dispose() },
  );
}

export function deactivate(): void {}
