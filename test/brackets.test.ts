import { describe, expect, it } from "vitest";
import { stripBracketOverflow } from "../src/brackets.js";

describe("stripBracketOverflow", () => {
  describe("C-family bracket overflow", () => {
    it("truncates trailing } when suffix has }", () => {
      const completion = "{ host: 'localhost', port: 3000 } as AppConfig;}";
      const suffix = "\n  if (!existsSync(path)) {\n    return config;\n  }";
      const result = stripBracketOverflow(completion, suffix, "typescript");
      expect(result).toBe("{ host: 'localhost', port: 3000 } as AppConfig;");
    });

    it("truncates at first excess closer", () => {
      const completion = "return a + b;\n  }\n}";
      const suffix = "\n}";
      const result = stripBracketOverflow(completion, suffix, "java");
      // First } brings balance to -1, truncates before it
      expect(result).toBe("return a + b;");
    });

    it("does not truncate balanced brackets", () => {
      const completion = "if (x) { return y; }";
      const suffix = "\n}";
      const result = stripBracketOverflow(completion, suffix, "typescript");
      expect(result).toBe("if (x) { return y; }");
    });

    it("truncates excess ) when suffix has )", () => {
      const completion = "a + b)";
      const suffix = ");\nconsole.log(result);";
      const result = stripBracketOverflow(completion, suffix, "javascript");
      expect(result).toBe("a + b");
    });

    it("truncates excess ] when suffix has ]", () => {
      const completion = "1, 2, 3]";
      const suffix = "];\nreturn arr;";
      const result = stripBracketOverflow(completion, suffix, "typescript");
      expect(result).toBe("1, 2, 3");
    });

    it("does not truncate when suffix has no closers", () => {
      const completion = "return x;}";
      const suffix = "\nconst a = 1;";
      const result = stripBracketOverflow(completion, suffix, "typescript");
      expect(result).toBe("return x;}");
    });
  });

  describe("string and comment awareness", () => {
    it("ignores brackets inside double-quoted strings", () => {
      const completion = 'const s = "hello { world }";';
      const suffix = "\n}";
      const result = stripBracketOverflow(completion, suffix, "typescript");
      expect(result).toBe('const s = "hello { world }";');
    });

    it("ignores brackets inside single-quoted strings", () => {
      const completion = "const s = 'hello } world';";
      const suffix = "\n}";
      const result = stripBracketOverflow(completion, suffix, "javascript");
      expect(result).toBe("const s = 'hello } world';");
    });

    it("ignores brackets inside line comments", () => {
      const completion = "return x; // TODO: fix }";
      const suffix = "\n}";
      const result = stripBracketOverflow(completion, suffix, "typescript");
      expect(result).toBe("return x; // TODO: fix }");
    });

    it("ignores brackets inside block comments", () => {
      const completion = "return x; /* { */ }";
      const suffix = "\n}";
      const result = stripBracketOverflow(completion, suffix, "typescript");
      // The { inside comment is ignored, the } outside is excess
      expect(result).toBe("return x; /* { */");
    });

    it("ignores brackets inside template literals", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal content
      const completion = "const s = `${x}`;";
      const suffix = "\n}";
      const result = stripBracketOverflow(completion, suffix, "typescript");
      expect(result).toBe(completion);
    });
  });

  describe("Python", () => {
    it("truncates excess ] in list context", () => {
      const completion = "item.strip().upper()]";
      const suffix = "]\n    return result";
      const result = stripBracketOverflow(completion, suffix, "python");
      expect(result).toBe("item.strip().upper()");
    });

    it("ignores brackets in Python comments", () => {
      const completion = "x = 1  # note: {";
      const suffix = "\n}";
      const result = stripBracketOverflow(completion, suffix, "python");
      expect(result).toBe("x = 1  # note: {");
    });
  });

  describe("edge cases", () => {
    it("returns empty completion unchanged", () => {
      expect(stripBracketOverflow("", "\n}", "typescript")).toBe("");
    });

    it("returns completion unchanged for unknown language", () => {
      const completion = "x;}";
      const suffix = "\n}";
      expect(stripBracketOverflow(completion, suffix, "plaintext")).toBe(
        completion,
      );
    });

    it("returns completion unchanged when suffix is empty", () => {
      const completion = "return x;}";
      expect(stripBracketOverflow(completion, "", "typescript")).toBe(
        completion,
      );
    });

    it("handles escaped quotes in strings", () => {
      const completion = 'const s = "he said \\"}\\""; }';
      const suffix = "\n}";
      const result = stripBracketOverflow(completion, suffix, "typescript");
      // The } after the string is excess
      expect(result).toBe('const s = "he said \\"}\\"";');
    });
  });
});
