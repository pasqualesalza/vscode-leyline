import { describe, expect, it } from "vitest";
import {
  extractContext,
  postProcess,
  stripDuplicateLines,
  stripLeadingIndent,
  stripOverlap,
  stripPrefixDuplicate,
  stripRepetition,
  visualWidth,
} from "../src/prompt.js";
import {
  charOverlapCases,
  lineOverlapCases,
  noOverlapCases,
} from "./fixtures/fim-cases.js";

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

describe("stripOverlap", () => {
  it("removes trailing overlap with suffix", () => {
    const completion = "fibonacci(n - 1) + fibonacci(n - 2);\n}";
    const suffix = "\n}";
    expect(stripOverlap(completion, suffix)).toBe(
      "fibonacci(n - 1) + fibonacci(n - 2);",
    );
  });

  it("removes multi-line overlap", () => {
    const completion = "x.toString();\n}\n\nconsole.log(greeting);";
    const suffix = "\n}\n\nconsole.log(greeting);";
    expect(stripOverlap(completion, suffix)).toBe("x.toString();");
  });

  it("returns completion unchanged when no overlap", () => {
    const completion = "a + b;";
    const suffix = "\n  }\n}";
    expect(stripOverlap(completion, suffix)).toBe("a + b;");
  });

  it("returns completion unchanged when suffix is empty", () => {
    const completion = "some code";
    expect(stripOverlap(completion, "")).toBe("some code");
  });

  it("returns empty string when completion is empty", () => {
    expect(stripOverlap("", "\n}")).toBe("");
  });

  it("handles completion entirely matching suffix start", () => {
    const completion = "\n}";
    const suffix = "\n}\n\nmore code";
    expect(stripOverlap(completion, suffix)).toBe("");
  });

  it("handles single character overlap", () => {
    const completion = "return x;";
    const suffix = ";";
    expect(stripOverlap(completion, suffix)).toBe("return x");
  });

  it("does not trim partial (non-suffix) matches", () => {
    const completion = "abc}def}";
    const suffix = "}ghi";
    expect(stripOverlap(completion, suffix)).toBe("abc}def");
  });

  for (const tc of charOverlapCases) {
    it(`fixture: ${tc.name}`, () => {
      expect(stripOverlap(tc.llmOutput, tc.suffix)).toBe(tc.expected);
    });
  }
});

describe("stripDuplicateLines", () => {
  it("removes trailing lines that match suffix start (TS closing brace)", () => {
    // Completion ends with "}" (no indent), suffix first non-empty is "  }" (indented)
    // Trimmed comparison: "}" === "}" → match → strip
    expect(stripDuplicateLines("    return x;\n}", "\n  }\n}\n")).toBe(
      "    return x;",
    );
  });

  it("removes trailing return line (Python)", () => {
    expect(
      stripDuplicateLines(
        "        x = 1\n    return x",
        "\n    return x\n\ndef main():",
      ),
    ).toBe("        x = 1");
  });

  it("removes trailing brace (Go)", () => {
    expect(stripDuplicateLines("\treturn n\n}", "\n}\n\nfunc main()")).toBe(
      "\treturn n",
    );
  });

  it("removes trailing brace (Rust)", () => {
    expect(stripDuplicateLines("    n - 1\n}", "\n}\n\nfn main()")).toBe(
      "    n - 1",
    );
  });

  it("removes trailing brace (Java)", () => {
    expect(
      stripDuplicateLines(
        "    return a + b;\n  }",
        "\n  }\n\n  public int sub()",
      ),
    ).toBe("    return a + b;");
  });

  it("handles indentation differences (trimmed comparison)", () => {
    expect(
      stripDuplicateLines("x;\n} else {", "\n  } else {\n    return -x;\n  }"),
    ).toBe("x;");
  });

  it("returns completion unchanged when no lines match", () => {
    expect(stripDuplicateLines("return 42;", "\nconsole.log(done);")).toBe(
      "return 42;",
    );
  });

  it("returns completion unchanged when suffix is empty", () => {
    expect(stripDuplicateLines("some code", "")).toBe("some code");
  });

  it("returns empty string when completion is empty", () => {
    expect(stripDuplicateLines("", "\n}")).toBe("");
  });

  it("handles suffix with only blank lines", () => {
    expect(stripDuplicateLines("x = 1", "\n\n\n")).toBe("x = 1");
  });

  it("removes multiple trailing lines that match", () => {
    expect(
      stripDuplicateLines("x = 1\n  }\n}", "\n  }\n}\n\nfunction main() {"),
    ).toBe("x = 1");
  });

  for (const tc of lineOverlapCases) {
    it(`fixture: ${tc.name}`, () => {
      expect(stripDuplicateLines(tc.llmOutput, tc.suffix)).toBe(tc.expected);
    });
  }
});

describe("stripLeadingIndent", () => {
  // ── Core case: model duplicates the exact indent ──────────────
  it("strips exact duplicated indent (4 spaces)", () => {
    // Line: "    |"  model returns "    return x;"
    // Without fix → "        return x;" (double indent)
    expect(stripLeadingIndent("    return x;", "    ")).toBe("return x;");
  });

  it("strips exact duplicated indent (tabs)", () => {
    expect(stripLeadingIndent("\t\treturn x;", "\t\t")).toBe("return x;");
  });

  it("strips exact duplicated indent (2 spaces)", () => {
    expect(stripLeadingIndent("  foo()", "  ")).toBe("foo()");
  });

  it("strips exact duplicated indent (mixed spaces/tabs)", () => {
    expect(stripLeadingIndent("  \tbar()", "  \t")).toBe("bar()");
  });

  // ── Model adds MORE indent than prefix (intentional nesting) ──
  it("preserves extra indent beyond the prefix", () => {
    // Line: "    |"  model returns "        if (x) {" (nested block)
    // Should strip only the 4-space prefix, keep the extra 4
    expect(stripLeadingIndent("        if (x) {", "    ")).toBe("    if (x) {");
  });

  it("preserves one extra tab beyond prefix", () => {
    // Line: "\t|"  model returns "\t\treturn x;" (deeper nesting)
    expect(stripLeadingIndent("\t\treturn x;", "\t")).toBe("\treturn x;");
  });

  // ── Model returns LESS indent than prefix ─────────────────────
  it("does not strip when completion indent is shorter than prefix", () => {
    // Line: "        |" (8 spaces)  model returns "    x = 1;" (4 spaces)
    // The 4 spaces don't match the 8-space prefix → leave as-is
    expect(stripLeadingIndent("    x = 1;", "        ")).toBe("    x = 1;");
  });

  // ── No-op cases: cursor at column 0 or after code ─────────────
  it("does not strip when cursor is at column 0", () => {
    // Indent is intentional — no duplication possible
    expect(stripLeadingIndent("    return x;", "")).toBe("    return x;");
  });

  it("does not strip when cursor is after code", () => {
    // currentLinePrefix has non-whitespace → not in indent zone
    expect(stripLeadingIndent("    return x;", "    const x = ")).toBe(
      "    return x;",
    );
  });

  it("does not strip when model returns no indent", () => {
    // Line: "    |"  model returns "return x;" (no indent)
    // Nothing to strip
    expect(stripLeadingIndent("return x;", "    ")).toBe("return x;");
  });

  // ── Multiline: all lines are stripped ───────────────────────────
  it("strips duplicate indent from all lines of a multiline completion", () => {
    expect(stripLeadingIndent("    return x;\n    y = 2;", "    ")).toBe(
      "return x;\ny = 2;",
    );
  });

  it("preserves relative indent across lines in multiline", () => {
    expect(
      stripLeadingIndent("        if (x) {\n            y;\n        }", "    "),
    ).toBe("    if (x) {\n        y;\n    }");
  });

  // ── Edge cases ─────────────────────────────────────────────────
  it("returns empty string for empty completion", () => {
    expect(stripLeadingIndent("", "    ")).toBe("");
  });

  it("handles completion that is only whitespace", () => {
    // Entire completion is whitespace matching prefix
    expect(stripLeadingIndent("    ", "    ")).toBe("");
  });

  // ── Tab/space mismatch (column-width fallback) ─────────────────
  it("strips spaces when editor uses tab (same visual width)", () => {
    // Editor: "\t" (1 tab = 4 cols), model: "    return x;" (4 spaces = 4 cols)
    expect(stripLeadingIndent("    return x;", "\t", 4)).toBe("return x;");
  });

  it("strips tab when editor uses spaces (same visual width)", () => {
    // Editor: "    " (4 spaces = 4 cols), model: "\treturn x;" (1 tab = 4 cols)
    expect(stripLeadingIndent("\treturn x;", "    ", 4)).toBe("return x;");
  });

  it("preserves extra space indent beyond tab prefix width", () => {
    // Editor: "\t" (4 cols), model: "        if (x) {" (8 spaces = 8 cols)
    // Strip 4 cols (4 spaces), keep remaining 4
    expect(stripLeadingIndent("        if (x) {", "\t", 4)).toBe(
      "    if (x) {",
    );
  });

  it("does not strip when column widths don't align", () => {
    // Editor: "  " (2 cols), model: "\treturn x;" (1 tab = 4 cols)
    // Can't strip 2 cols cleanly — tab is 4 cols → bail
    expect(stripLeadingIndent("\treturn x;", "  ", 4)).toBe("\treturn x;");
  });

  it("handles tabSize=2 correctly", () => {
    // Editor: "\t" (2 cols with tabSize=2), model: "  foo()" (2 spaces)
    expect(stripLeadingIndent("  foo()", "\t", 2)).toBe("foo()");
  });

  it("handles mixed tab+spaces in completion matching tab prefix", () => {
    // Editor: "\t\t" (8 cols), model: "  \t    return x;"
    // 2 spaces (2) + tab (jumps to 4) + 4 spaces (8) = 8 cols → strip
    expect(stripLeadingIndent("  \t    return x;", "\t\t", 4)).toBe(
      "return x;",
    );
  });
});

describe("visualWidth", () => {
  it("counts spaces as 1 column each", () => {
    expect(visualWidth("    ", 4)).toBe(4);
  });

  it("counts tab as tabSize columns from position 0", () => {
    expect(visualWidth("\t", 4)).toBe(4);
  });

  it("counts tab to next tab stop", () => {
    // 2 spaces + tab → snaps to column 4
    expect(visualWidth("  \t", 4)).toBe(4);
  });

  it("counts multiple tabs", () => {
    expect(visualWidth("\t\t", 4)).toBe(8);
  });

  it("handles tabSize=2", () => {
    expect(visualWidth("\t", 2)).toBe(2);
  });

  it("handles empty string", () => {
    expect(visualWidth("", 4)).toBe(0);
  });
});

describe("stripRepetition", () => {
  it("truncates a 3-line block repeated twice", () => {
    const completion = [
      "return [...this.repositories.values()].filter(",
      "  (repo) => repo.owner.id === ownerId,",
      ");",
      "return [...this.repositories.values()].filter(",
      "  (repo) => repo.owner.id === ownerId,",
      ");",
    ].join("\n");
    expect(stripRepetition(completion)).toBe(
      [
        "return [...this.repositories.values()].filter(",
        "  (repo) => repo.owner.id === ownerId,",
        ");",
      ].join("\n"),
    );
  });

  it("truncates a 3-line block repeated three times", () => {
    const block = [
      "return [...this.repositories.values()].filter(",
      "  (repo) => repo.owner.id === ownerId,",
      ");",
    ];
    const completion = [...block, ...block, ...block].join("\n");
    expect(stripRepetition(completion)).toBe(block.join("\n"));
  });

  it("does not truncate when there is no repetition", () => {
    const completion = "const a = 1;\nconst b = 2;\nreturn a + b;";
    expect(stripRepetition(completion)).toBe(completion);
  });

  it("ignores blocks that are all whitespace", () => {
    const completion = "const a = 1;\n\n\n\nconst b = 2;";
    expect(stripRepetition(completion)).toBe(completion);
  });

  it("returns short completions unchanged", () => {
    expect(stripRepetition("a\nb\nc")).toBe("a\nb\nc");
  });

  it("preserves code before the repeated block", () => {
    const completion = [
      "const x = 1;",
      "console.log(x);",
      "console.log(x);",
      "console.log(x);",
      "console.log(x);",
    ].join("\n");
    expect(stripRepetition(completion)).toBe(
      ["const x = 1;", "console.log(x);", "console.log(x);"].join("\n"),
    );
  });

  it("completes quickly on very long input (blockSize capped at 20)", () => {
    // 200 unique lines — without the cap this would be O(n³) ≈ 4M iterations
    const lines = Array.from({ length: 200 }, (_, i) => `line ${i}: code();`);
    const completion = lines.join("\n");
    const start = performance.now();
    const result = stripRepetition(completion);
    const elapsed = performance.now() - start;
    expect(result).toBe(completion);
    expect(elapsed).toBeLessThan(100);
  });
});

describe("stripPrefixDuplicate", () => {
  it("suppresses completion that duplicates a block in the prefix", () => {
    const prefix = [
      "class Foo {",
      "  async listByOwner(ownerId: string): Promise<Repo[]> {",
      "    return this.repos.filter((r) => r.owner === ownerId);",
      "  }",
      "",
      "  // cursor here",
      "  ",
    ].join("\n");
    const completion = [
      "async listByOwner(ownerId: string): Promise<Repo[]> {",
      "    return this.repos.filter((r) => r.owner === ownerId);",
      "  }",
    ].join("\n");
    expect(stripPrefixDuplicate(completion, prefix)).toBe("");
  });

  it("keeps completion that is genuinely new code", () => {
    const prefix = "class Foo {\n  bar() {}\n  ";
    const completion = "baz() {\n    return 42;\n  }";
    expect(stripPrefixDuplicate(completion, prefix)).toBe(completion);
  });

  it("returns completion unchanged for short completions (< 2 lines)", () => {
    const prefix = "const x = 1;\n";
    const completion = "const y = 2;";
    expect(stripPrefixDuplicate(completion, prefix)).toBe(completion);
  });

  it("handles empty prefix", () => {
    expect(stripPrefixDuplicate("some code\nmore code", "")).toBe(
      "some code\nmore code",
    );
  });

  it("skips blank lines in prefix when matching", () => {
    const prefix = "  foo();\n\n  bar();\n  ";
    const completion = "foo();\n  bar();";
    expect(stripPrefixDuplicate(completion, prefix)).toBe("");
  });
});

describe("postProcess", () => {
  it("applies only char-level when sufficient", () => {
    const completion = "fibonacci(n - 1) + fibonacci(n - 2);\n}";
    const suffix = "\n}";
    expect(postProcess(completion, "", suffix)).toBe(
      "fibonacci(n - 1) + fibonacci(n - 2);",
    );
  });

  it("applies only line-level when char-level misses", () => {
    expect(
      postProcess(
        "    return x;\n  }",
        "",
        "\n  } else {\n    return -x;\n  }",
      ),
    ).toBe("    return x;");
  });

  it("applies both in cascade", () => {
    // Char-level removes exact overlap, then line-level cleans remaining duplication
    const completion = "a + b;\n  }\n}";
    const suffix = "\n}\n\nfunction bar() {";
    const result = postProcess(completion, "", suffix);
    expect(result).not.toContain("\n}");
  });

  it("does not alter when no overlap exists", () => {
    expect(postProcess("return 42;", "", "\nconsole.log(done);")).toBe(
      "return 42;",
    );
  });

  it("returns empty string for empty completion", () => {
    expect(postProcess("", "", "\n}")).toBe("");
  });

  it("returns completion unchanged for empty suffix", () => {
    expect(postProcess("some code", "", "")).toBe("some code");
  });

  it("handles fibonacci + closing brace (real-world)", () => {
    const completion = "fibonacci(n - 1) + fibonacci(n - 2);\n}";
    const suffix =
      "\n}\n\nconsole.log(fibonacci(10));\nconsole.log(fibonacci(20));\n";
    expect(postProcess(completion, "", suffix)).toBe(
      "fibonacci(n - 1) + fibonacci(n - 2);",
    );
  });

  it("handles if/else with rich suffix (real-world)", () => {
    const completion = "x;\n  }";
    const suffix = "\n  } else {\n    return -x;\n  }\n}\n";
    expect(postProcess(completion, "", suffix)).toBe("x;");
  });

  it("is idempotent", () => {
    const completion = "fibonacci(n - 1) + fibonacci(n - 2);\n}";
    const suffix = "\n}\n\nconsole.log(fibonacci(10));\n";
    const once = postProcess(completion, "", suffix);
    const twice = postProcess(once, "", suffix);
    expect(twice).toBe(once);
  });

  it("suppresses completion that duplicates prefix", () => {
    const prefix = "  foo();\n  bar();\n  ";
    const completion = "foo();\n  bar();";
    expect(postProcess(completion, prefix, "\n}")).toBe("");
  });

  for (const tc of noOverlapCases) {
    it(`no-op fixture: ${tc.name}`, () => {
      expect(postProcess(tc.llmOutput, "", tc.suffix)).toBe(tc.expected);
    });
  }
});
