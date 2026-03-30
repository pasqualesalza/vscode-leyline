import * as vscode from "vscode";

let channel: vscode.LogOutputChannel | undefined;

export function initLog(): vscode.LogOutputChannel {
  channel = vscode.window.createOutputChannel("Leyline", { log: true });
  return channel;
}

export function log(): vscode.LogOutputChannel | undefined {
  return channel;
}
