import * as vscode from "vscode";
import type { StatusBarState } from "./types.js";

let statusBarItem: vscode.StatusBarItem | undefined;
let lastProviderName: string | undefined;

export function createStatusBar(): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(
    "leyline.statusBar",
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.name = "Leyline";
  statusBarItem.command = "leyline.showMenu";
  updateStatusBar("ready");
  statusBarItem.show();
  return statusBarItem;
}

export function updateStatusBar(
  state: StatusBarState,
  providerName?: string,
  errorMessage?: string,
): void {
  if (!statusBarItem) return;

  if (providerName !== undefined) lastProviderName = providerName;

  switch (state) {
    case "ready": {
      statusBarItem.text = "$(leyline-sparkle) Leyline";
      const tip = new vscode.MarkdownString(
        lastProviderName
          ? `Leyline: Inline completion enabled — **${lastProviderName}**`
          : "Leyline: Inline completion enabled",
      );
      tip.isTrusted = true;
      statusBarItem.tooltip = tip;
      statusBarItem.backgroundColor = undefined;
      break;
    }
    case "loading":
      statusBarItem.text = "$(loading~spin) Leyline";
      statusBarItem.tooltip = "Leyline: Generating completion...";
      statusBarItem.backgroundColor = undefined;
      break;
    case "disabled": {
      statusBarItem.text = "$(circle-slash) Leyline";
      const tip = new vscode.MarkdownString(
        lastProviderName
          ? `Leyline: Inline completion disabled — **${lastProviderName}**`
          : "Leyline: Inline completion disabled",
      );
      tip.isTrusted = true;
      statusBarItem.tooltip = tip;
      statusBarItem.backgroundColor = undefined;
      break;
    }
    case "error": {
      statusBarItem.text = "$(error) Leyline";
      const errTip = new vscode.MarkdownString(
        errorMessage ? `Leyline: ${errorMessage}` : "Leyline: Error occurred",
      );
      errTip.isTrusted = true;
      statusBarItem.tooltip = errTip;
      statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground",
      );
      break;
    }
  }
}
