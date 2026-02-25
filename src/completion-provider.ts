import * as vscode from "vscode";
import * as config from "./config.js";
import { extractContext } from "./prompt.js";
import type { CompletionProvider } from "./providers/provider.js";
import { updateStatusBar } from "./statusbar.js";

export class LeylineCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private readonly getProvider: () => CompletionProvider | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private abortController: AbortController | undefined;
  private pendingResolve:
    | ((value: vscode.InlineCompletionItem[] | undefined) => void)
    | undefined;

  constructor(getProvider: () => CompletionProvider | undefined) {
    this.getProvider = getProvider;
  }

  provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    this.cancel();

    if (!config.enabled()) return Promise.resolve(undefined);

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

          const completion = await provider.complete(
            prefix,
            suffix,
            document.languageId,
            signal,
          );

          if (token.isCancellationRequested || !completion) {
            if (isActive()) updateStatusBar("ready");
            this.settle(resolve, undefined);
            return;
          }

          if (isActive()) updateStatusBar("ready");
          this.settle(resolve, [
            new vscode.InlineCompletionItem(
              completion,
              new vscode.Range(position, position),
            ),
          ]);
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            if (isActive()) updateStatusBar("ready");
            this.settle(resolve, undefined);
            return;
          }
          console.error("[Leyline]", err);
          if (isActive()) updateStatusBar("error");
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

  dispose(): void {
    this.cancel();
  }
}
