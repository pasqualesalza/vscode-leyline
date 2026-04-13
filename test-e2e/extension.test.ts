import * as assert from "node:assert";
import * as vscode from "vscode";

suite("Leyline Extension", () => {
  const extensionId = "pasqualesalza.leyline";

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(extensionId);
    assert.ok(ext, "Extension should be installed");
    await ext.activate();
  });

  test("activates successfully", () => {
    const ext = vscode.extensions.getExtension(extensionId);
    assert.ok(ext?.isActive);
  });

  test("all commands are registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    for (const cmd of [
      "leyline.toggle",
      "leyline.setApiKey",
      "leyline.selectProvider",
      "leyline.showMenu",
    ]) {
      assert.ok(commands.includes(cmd), `Missing command: ${cmd}`);
    }
  });

  test("default configuration values", () => {
    const c = vscode.workspace.getConfiguration("leyline");
    assert.strictEqual(c.get("provider"), "codestral");
    assert.strictEqual(c.get("enabled"), true);
    assert.strictEqual(c.get("debounceMs"), 300);
    assert.strictEqual(c.get("prefixLines"), 100);
    assert.strictEqual(c.get("suffixLines"), 30);
  });

  test("toggle command flips enabled state", async () => {
    const before = vscode.workspace
      .getConfiguration("leyline")
      .get<boolean>("enabled");
    try {
      await vscode.commands.executeCommand("leyline.toggle");
      const after = vscode.workspace
        .getConfiguration("leyline")
        .get<boolean>("enabled");
      assert.notStrictEqual(before, after);
    } finally {
      // Restore regardless of assertion outcome
      const current = vscode.workspace
        .getConfiguration("leyline")
        .get<boolean>("enabled");
      if (current !== before) {
        await vscode.commands.executeCommand("leyline.toggle");
      }
    }
  });

  test("completion provider handles empty document without crash", async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: "",
      language: "plaintext",
    });
    await vscode.window.showTextDocument(doc);
    // Trigger inline suggest — if no crash, it's OK
    await vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("cross-file context: open tabs are visible to the extension", async () => {
    // Open two TypeScript files
    const typesDoc = await vscode.workspace.openTextDocument({
      content:
        "export interface User { id: number; name: string; active: boolean; }\n",
      language: "typescript",
    });
    const handlerDoc = await vscode.workspace.openTextDocument({
      content:
        'import { User } from "./types";\n\nconst users: User[] = [];\nconst active = \n',
      language: "typescript",
    });

    await vscode.window.showTextDocument(typesDoc, vscode.ViewColumn.One);
    await vscode.window.showTextDocument(handlerDoc, vscode.ViewColumn.Two);

    // Verify both documents are in workspace.textDocuments
    const openDocs = vscode.workspace.textDocuments;
    const tsOpenDocs = openDocs.filter(
      (d) => d.languageId === "typescript" && d.uri.scheme === "untitled",
    );
    assert.ok(
      tsOpenDocs.length >= 2,
      `Expected at least 2 open TS docs, got ${tsOpenDocs.length}`,
    );

    // Trigger completion on the handler doc — should not crash
    await vscode.window.showTextDocument(handlerDoc);
    await vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");

    // Clean up
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("cross-file context: default config is enabled", () => {
    const c = vscode.workspace.getConfiguration("leyline");
    assert.strictEqual(c.get("crossFileContext"), true);
    assert.strictEqual(c.get("crossFileContextTokens"), 500);
  });
});
