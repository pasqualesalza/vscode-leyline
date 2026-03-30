import * as vscode from "vscode";
import { LeylineCompletionProvider } from "./completion-provider.js";
import * as config from "./config.js";
import { initLog, log } from "./log.js";
import { CodestralProvider } from "./providers/codestral.js";
import { OllamaProvider } from "./providers/ollama.js";
import type { CompletionProvider } from "./providers/provider.js";
import { getApiKey, initSecretStorage, setApiKey } from "./secret.js";
import { createStatusBar, updateStatusBar } from "./statusbar.js";
import { GrammarRegistry, TreeSitterValidator } from "./tree-sitter.js";

let currentProvider: CompletionProvider | undefined;

function refreshStatusBar(): void {
  if (!config.enabled()) {
    updateStatusBar("disabled", config.provider());
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
    updateStatusBar(excluded ? "disabled" : "ready", config.provider());
  } else {
    updateStatusBar("ready", config.provider());
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
        getApiKey(config.provider())
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
  });

  const editorListener = vscode.window.onDidChangeActiveTextEditor(() => {
    refreshStatusBar();
  });

  context.subscriptions.push(
    logChannel,
    statusBar,
    editorListener,
    completionRegistration,
    setApiKeyCmd,
    toggleCmd,
    selectProviderCmd,
    showMenuCmd,
    triggerCmd,
    configListener,
    { dispose: () => tsValidator?.dispose() },
    { dispose: () => completionProvider.dispose() },
  );
}

export function deactivate(): void {}
