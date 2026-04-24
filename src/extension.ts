import * as vscode from "vscode";
import { LeylineCompletionProvider } from "./completion-provider.js";
import * as config from "./config.js";
import { trackRecentEdit } from "./context.js";
import { initLog, log } from "./log.js";
import { CodestralProvider } from "./providers/codestral.js";
import { OllamaProvider } from "./providers/ollama.js";
import {
  type CompletionProvider,
  providerRequiresApiKey,
} from "./providers/provider.js";
import { getApiKey, initSecretStorage, setApiKey } from "./secret.js";
import { createStatusBar, updateStatusBar } from "./statusbar.js";
import { GrammarRegistry, TreeSitterValidator } from "./tree-sitter.js";

let currentProvider: CompletionProvider | undefined;

function refreshStatusBar(): void {
  const providerName = config.provider();
  if (!config.enabled()) {
    updateStatusBar("disabled", providerName);
    return;
  }
  if (providerRequiresApiKey(providerName)) {
    getApiKey(providerName)
      .then((key) => {
        if (!key) {
          updateStatusBar("unconfigured", providerName);
          return;
        }
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const lang = editor.document.languageId;
          const excluded =
            !config.enabledForLanguage(lang) ||
            config
              .disableInFiles()
              .some(
                (pattern) =>
                  vscode.languages.match({ pattern }, editor.document) > 0,
              );
          updateStatusBar(excluded ? "disabled" : "ready", providerName);
        } else {
          updateStatusBar("ready", providerName);
        }
      })
      .catch(() => {});
    return;
  }
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const lang = editor.document.languageId;
    const excluded =
      !config.enabledForLanguage(lang) ||
      config
        .disableInFiles()
        .some(
          (pattern) => vscode.languages.match({ pattern }, editor.document) > 0,
        );
    updateStatusBar(excluded ? "disabled" : "ready", providerName);
  } else {
    updateStatusBar("ready", providerName);
  }
}

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
  const logChannel = initLog();
  initSecretStorage(context.secrets);

  currentProvider = buildProvider();
  log()?.info(
    `Activated: provider=${config.provider()}, tabOverride=${config.tabOverride()}, treeSitter=${config.treeSitter()}, cache=${config.cacheSize()}`,
  );
  const statusBar = createStatusBar();
  refreshStatusBar();

  vscode.commands.executeCommand(
    "setContext",
    "leyline.tabOverride",
    config.tabOverride(),
  );

  let tsValidator: TreeSitterValidator | undefined;
  if (config.treeSitter()) {
    tsValidator = new TreeSitterValidator(
      new GrammarRegistry(context.globalStorageUri.fsPath),
    );
  }

  if (providerRequiresApiKey(config.provider())) {
    getApiKey(config.provider())
      .then((key) => {
        if (!key) {
          vscode.window
            .showInformationMessage(
              "Leyline: No API key configured",
              "Set API Key",
            )
            .then((choice) => {
              if (choice) vscode.commands.executeCommand("leyline.setApiKey");
            });
        }
      })
      .catch(() => {});
  }

  const completionProvider = new LeylineCompletionProvider(
    () => currentProvider,
    tsValidator,
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
      if (key) {
        await setApiKey(providerName, key);
        vscode.window.showInformationMessage(
          `Leyline: API key saved for ${providerName}`,
        );
        refreshStatusBar();
      }
    },
  );

  const toggleCmd = vscode.commands.registerCommand(
    "leyline.toggle",
    async () => {
      const newValue = !config.enabled();
      await config.setEnabled(newValue);
      refreshStatusBar();
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

  const triggerCmd = vscode.commands.registerCommand("leyline.trigger", () => {
    vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
  });

  const testConnectionCmd = vscode.commands.registerCommand(
    "leyline.testConnection",
    async () => {
      const providerName = config.provider();
      const providerCfg = config.providerConfig(providerName);

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Leyline: Testing connection to ${providerName}…`,
          cancellable: false,
        },
        async () => {
          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
            };

            let url: string;
            let body: object;

            if (providerName === "codestral") {
              const apiKey = await getApiKey(providerName);
              if (!apiKey) {
                vscode.window
                  .showWarningMessage(
                    "Leyline: No API key set for Codestral.",
                    "Set API Key",
                  )
                  .then((choice) => {
                    if (choice)
                      vscode.commands.executeCommand("leyline.setApiKey");
                  });
                return;
              }
              headers.Authorization = `Bearer ${apiKey}`;
              url = `${providerCfg.endpoint.replace(/\/+$/, "")}/v1/fim/completions`;
              body = {
                model: providerCfg.model,
                prompt: "f",
                suffix: "",
                max_tokens: 1,
                stream: false,
              };
            } else {
              const apiKey = await getApiKey(providerName);
              if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
              url = `${providerCfg.endpoint.replace(/\/+$/, "")}/api/generate`;
              body = { model: providerCfg.model, prompt: "f", stream: false };
            }

            const signal = AbortSignal.timeout(10_000);
            const response = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
              signal,
            });

            if (response.ok) {
              const ep = providerCfg.endpoint;
              vscode.window.showInformationMessage(
                `$(check) Leyline: Connection successful — ${providerName} at ${ep}`,
              );
              log()?.info(`Test connection OK: provider=${providerName}`);
            } else {
              const text = await response.text().catch(() => "");
              let detail = text.slice(0, 200) || response.statusText;
              try {
                const parsed = JSON.parse(text) as {
                  message?: string;
                  error?: string;
                };
                if (typeof parsed.message === "string") detail = parsed.message;
                else if (typeof parsed.error === "string")
                  detail = parsed.error;
              } catch {}
              const msg = `${providerName} returned ${response.status}: ${detail}`;
              log()?.warn(`Test connection failed: ${msg}`);
              vscode.window.showErrorMessage(`$(error) Leyline: ${msg}`);
            }
          } catch (err: unknown) {
            const msg =
              err instanceof Error ? err.message : "Connection failed";
            log()?.warn(`Test connection error: ${msg}`);
            vscode.window.showErrorMessage(
              `$(error) Leyline: Cannot reach ${config.provider()} endpoint — ${msg}`,
            );
          }
        },
      );
    },
  );

  const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("leyline")) {
      completionProvider.cancel();
      completionProvider.clearCache();
      currentProvider = buildProvider();
      log()?.info(
        `Config changed: provider=${config.provider()}, treeSitter=${config.treeSitter()}, cache=${config.cacheSize()}`,
      );
      refreshStatusBar();

      if (e.affectsConfiguration("leyline.tabOverride")) {
        vscode.commands.executeCommand(
          "setContext",
          "leyline.tabOverride",
          config.tabOverride(),
        );
      }

      if (e.affectsConfiguration("leyline.treeSitter")) {
        tsValidator?.dispose();
        tsValidator = config.treeSitter()
          ? new TreeSitterValidator(
              new GrammarRegistry(context.globalStorageUri.fsPath),
            )
          : undefined;
        completionProvider.setValidator(tsValidator);
      }

      if (e.affectsConfiguration("leyline.provider")) {
        const newProvider = config.provider();
        if (providerRequiresApiKey(newProvider)) {
          getApiKey(newProvider)
            .then((key) => {
              if (!key) {
                vscode.window
                  .showInformationMessage(
                    "Leyline: No API key configured",
                    "Set API Key",
                  )
                  .then((choice) => {
                    if (choice)
                      vscode.commands.executeCommand("leyline.setApiKey");
                  });
              }
            })
            .catch(() => {});
        }
      }
    }
  });

  const editorListener = vscode.window.onDidChangeActiveTextEditor(() => {
    refreshStatusBar();
  });

  const editTracker = vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.uri.scheme === "file") {
      trackRecentEdit(e.document.uri);
    }
  });

  context.subscriptions.push(
    logChannel,
    statusBar,
    editorListener,
    editTracker,
    completionRegistration,
    setApiKeyCmd,
    toggleCmd,
    selectProviderCmd,
    showMenuCmd,
    triggerCmd,
    testConnectionCmd,
    configListener,
    { dispose: () => tsValidator?.dispose() },
    { dispose: () => completionProvider.dispose() },
  );
}

export function deactivate(): void {}
