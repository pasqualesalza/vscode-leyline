import * as vscode from "vscode";
import { onTruncation } from "./brackets.js";
import { LruCache } from "./cache.js";
import * as config from "./config.js";
import { log } from "./log.js";
import { shouldMultiline } from "./multiline.js";
import { extractContext, postProcess, stripLeadingIndent } from "./prompt.js";
import type { CompletionProvider } from "./providers/provider.js";
import { updateStatusBar } from "./statusbar.js";
import type { TreeSitterValidator } from "./tree-sitter.js";

onTruncation((charsRemoved) => {
  log()?.debug(`Bracket overflow: truncated ${charsRemoved} chars`);
});

function isFileExcluded(document: vscode.TextDocument): boolean {
  return config
    .disableInFiles()
    .some((pattern) => vscode.languages.match({ pattern }, document) > 0);
}

export class LeylineCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private readonly getProvider: () => CompletionProvider | undefined;
  private validator: TreeSitterValidator | undefined;
  private cache = new LruCache<string>(config.cacheSize());
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private abortController: AbortController | undefined;
  private pendingResolve:
    | ((value: vscode.InlineCompletionItem[] | undefined) => void)
    | undefined;

  constructor(
    getProvider: () => CompletionProvider | undefined,
    validator?: TreeSitterValidator,
  ) {
    this.getProvider = getProvider;
    this.validator = validator;
  }

  setValidator(validator: TreeSitterValidator | undefined): void {
    this.validator = validator;
  }

  provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    this.cancel();

    if (!config.enabledForLanguage(document.languageId)) {
      log()?.debug(`Skipped: language ${document.languageId} disabled`);
      return Promise.resolve(undefined);
    }

    if (isFileExcluded(document)) {
      log()?.debug(`Skipped: file excluded by glob`);
      return Promise.resolve(undefined);
    }

    // When IntelliSense has a selected item, bail out to avoid
    // showing ghost text that Tab can't accept (VS Code limitation:
    // Tab prefers the suggest widget over inline completions).
    if (context.selectedCompletionInfo) return Promise.resolve(undefined);

    const provider = this.getProvider();
    if (!provider) return Promise.resolve(undefined);

    return new Promise((resolve) => {
      this.pendingResolve = resolve;

      this.debounceTimer = setTimeout(async () => {
        this.debounceTimer = undefined;
        const isActive = () => this.pendingResolve === resolve;

        if (token.isCancellationRequested) {
          this.settle(resolve, undefined);
          return;
        }

        const controller = new AbortController();
        this.abortController = controller;
        const { signal } = controller;

        const disposable = token.onCancellationRequested(() => {
          controller.abort();
        });

        try {
          if (isActive()) updateStatusBar("loading");

          const offset = document.offsetAt(position);
          const text = document.getText();
          const { prefix, suffix } = extractContext(
            text,
            offset,
            config.prefixLines(),
            config.suffixLines(),
          );

          const multiline = shouldMultiline(prefix, document.languageId);
          const stopOverride = multiline ? [] : undefined;
          const cacheKey = `${document.languageId}\0${multiline ? "m" : "s"}\0${prefix}\0${suffix}`;
          const cached = this.cache.get(cacheKey);

          let completion: string | null;
          if (cached !== undefined) {
            completion = cached;
            log()?.debug("Cache hit");
          } else {
            const t0 = Date.now();
            log()?.debug(
              `Request: lang=${document.languageId} provider=${provider.name} multiline=${multiline}`,
            );

            completion = await provider.complete(
              prefix,
              suffix,
              document.languageId,
              signal,
              stopOverride,
            );

            log()?.debug(
              `Response: ${Date.now() - t0}ms, empty=${!completion}`,
            );

            if (completion) {
              this.cache.set(cacheKey, completion);
            }
          }

          const trimmed = completion
            ? postProcess(completion, prefix, suffix, document.languageId)
            : null;
          const currentLinePrefix = document
            .lineAt(position.line)
            .text.slice(0, position.character);
          const editorTabSize = vscode.window.activeTextEditor?.options.tabSize;
          const tabSize = typeof editorTabSize === "number" ? editorTabSize : 4;
          const adjusted = trimmed
            ? stripLeadingIndent(trimmed, currentLinePrefix, tabSize)
            : null;

          if (token.isCancellationRequested || !adjusted) {
            if (isActive()) updateStatusBar("ready");
            this.settle(resolve, undefined);
            return;
          }

          if (adjusted && this.validator) {
            try {
              const valid = await this.validator.validate(
                prefix,
                adjusted,
                suffix,
                document.languageId,
              );
              if (!valid) {
                log()?.info("Tree-sitter: completion rejected (syntax errors)");
                if (isActive()) updateStatusBar("ready");
                this.settle(resolve, undefined);
                return;
              }
              log()?.debug("Tree-sitter: accepted");
            } catch (err) {
              log()?.warn(
                `Tree-sitter: error, accepting (${err instanceof Error ? err.message : err})`,
              );
            }
          }

          if (isActive()) updateStatusBar("ready");
          const lineStart = new vscode.Position(position.line, 0);
          this.settle(resolve, [
            new vscode.InlineCompletionItem(
              currentLinePrefix + adjusted,
              new vscode.Range(lineStart, position),
            ),
          ]);
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            if (isActive()) updateStatusBar("ready");
            this.settle(resolve, undefined);
            return;
          }
          // Debug Console: full error for the developer during F5
          console.error("[Leyline] completion error:", err);
          // Output panel: sanitised message for the end user
          const msg = err instanceof Error ? err.message : "Unknown error";
          log()?.error(`Completion failed: ${msg}`);
          if (isActive()) updateStatusBar("error", undefined, msg);
          setTimeout(() => {
            if (!this.pendingResolve && config.enabled())
              updateStatusBar("ready");
          }, 5000);
          this.settle(resolve, undefined);
        } finally {
          disposable.dispose();
        }
      }, config.debounceMs());
    });
  }

  private settle(
    resolve: (value: vscode.InlineCompletionItem[] | undefined) => void,
    value: vscode.InlineCompletionItem[] | undefined,
  ): void {
    if (this.pendingResolve === resolve) {
      this.pendingResolve = undefined;
    }
    resolve(value);
  }

  cancel(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
    if (this.pendingResolve) {
      this.pendingResolve(undefined);
      this.pendingResolve = undefined;
    }
  }

  clearCache(): void {
    this.cache = new LruCache<string>(config.cacheSize());
  }

  dispose(): void {
    this.cancel();
  }
}
