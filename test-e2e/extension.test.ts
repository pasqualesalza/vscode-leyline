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
});
