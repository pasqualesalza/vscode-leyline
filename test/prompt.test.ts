import { describe, expect, it } from "vitest";
import { buildFIMMessages, extractContext } from "../src/prompt.js";

describe("extractContext", () => {
  it("returns full text when within limits", () => {
    const text = "line1\nline2\nline3";
    const offset = 11; // after "line2"
    const { prefix, suffix } = extractContext(text, offset, 100, 30);
    expect(prefix).toBe("line1\nline2");
    expect(suffix).toBe("\nline3");
  });

  it("truncates prefix to configured lines", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line${i}`);
    const text = lines.join("\n");
    const offset = text.length; // cursor at end
    const { prefix } = extractContext(text, offset, 3, 30);
    expect(prefix).toBe("line7\nline8\nline9");
  });

  it("truncates suffix to configured lines", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line${i}`);
    const text = lines.join("\n");
    const offset = 0; // cursor at start
    const { suffix } = extractContext(text, offset, 100, 3);
    expect(suffix).toBe("line0\nline1\nline2");
  });

  it("handles cursor at start of document", () => {
    const text = "hello\nworld";
    const { prefix, suffix } = extractContext(text, 0, 100, 30);
    expect(prefix).toBe("");
    expect(suffix).toBe("hello\nworld");
  });

  it("handles cursor at end of document", () => {
    const text = "hello\nworld";
    const { prefix, suffix } = extractContext(text, text.length, 100, 30);
    expect(prefix).toBe("hello\nworld");
    expect(suffix).toBe("");
  });

  it("handles empty document", () => {
    const { prefix, suffix } = extractContext("", 0, 100, 30);
    expect(prefix).toBe("");
    expect(suffix).toBe("");
  });
});

describe("buildFIMMessages", () => {
  it("returns system and user messages", () => {
    const messages = buildFIMMessages(
      "const x =",
      ";",
      "typescript",
      "test.ts",
    );
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("includes language in system message", () => {
    const messages = buildFIMMessages("", "", "python", "test.py");
    expect(messages[0].content).toContain("python");
  });

  it("includes prefix and suffix in user message", () => {
    const messages = buildFIMMessages(
      "const x =",
      ";\nconsole.log(x);",
      "typescript",
      "test.ts",
    );
    expect(messages[1].content).toContain("<prefix>\nconst x =\n</prefix>");
    expect(messages[1].content).toContain(
      "<suffix>\n;\nconsole.log(x);\n</suffix>",
    );
  });
});
