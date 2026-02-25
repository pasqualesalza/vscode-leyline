import * as vscode from "vscode";
import type { StatusBarState } from "./types.js";

let statusBarItem: vscode.StatusBarItem | undefined;

export function createStatusBar(): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "leyline.toggle";
  updateStatusBar("ready");
  statusBarItem.show();
  return statusBarItem;
}

export function updateStatusBar(state: StatusBarState): void {
  if (!statusBarItem) return;

  switch (state) {
    case "ready":
      statusBarItem.text = "$(leyline-sparkle) Leyline";
      statusBarItem.tooltip = "Leyline: Inline completion enabled";
      statusBarItem.backgroundColor = undefined;
      break;
    case "loading":
      statusBarItem.text = "$(loading~spin) Leyline";
      statusBarItem.tooltip = "Leyline: Generating completion...";
      statusBarItem.backgroundColor = undefined;
      break;
    case "disabled":
      statusBarItem.text = "$(circle-slash) Leyline";
      statusBarItem.tooltip = "Leyline: Inline completion disabled";
      statusBarItem.backgroundColor = undefined;
      break;
    case "error":
      statusBarItem.text = "$(error) Leyline";
      statusBarItem.tooltip = "Leyline: Error occurred";
      statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground",
      );
      break;
  }
}
