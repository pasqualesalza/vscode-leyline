import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LANG_TO_GRAMMAR } from "../src/tree-sitter.js";

describe("LANG_TO_GRAMMAR", () => {
  it("maps all C-family languages from brackets.ts", () => {
    const expected = [
      "typescript",
      "typescriptreact",
      "javascript",
      "javascriptreact",
      "java",
      "c",
      "cpp",
      "csharp",
      "go",
      "rust",
    ];
    for (const lang of expected) {
      expect(LANG_TO_GRAMMAR[lang]).toBeDefined();
    }
  });

  it("maps python", () => {
    expect(LANG_TO_GRAMMAR.python).toBe("python");
  });

  it("returns undefined for unmapped languages", () => {
    expect(LANG_TO_GRAMMAR.plaintext).toBeUndefined();
    expect(LANG_TO_GRAMMAR.yaml).toBeUndefined();
    expect(LANG_TO_GRAMMAR.toml).toBeUndefined();
  });

  it("maps typescriptreact to tsx", () => {
    expect(LANG_TO_GRAMMAR.typescriptreact).toBe("tsx");
  });
});

describe.skipIf(!process.env.LEYLINE_TEST_TREESITTER)(
  "TreeSitterValidator (integration)",
  { timeout: 60_000 },
  () => {
    // Dynamic imports to avoid loading WASM when tests are skipped
    let TreeSitterValidator: typeof import("../src/tree-sitter.js").TreeSitterValidator;
    let GrammarRegistry: typeof import("../src/tree-sitter.js").GrammarRegistry;
    let validator: InstanceType<
      typeof import("../src/tree-sitter.js").TreeSitterValidator
    >;
    let tmpDir: string;

    beforeAll(async () => {
      const mod = await import("../src/tree-sitter.js");
      TreeSitterValidator = mod.TreeSitterValidator;
      GrammarRegistry = mod.GrammarRegistry;
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "leyline-ts-test-"));
      const registry = new GrammarRegistry(tmpDir);
      validator = new TreeSitterValidator(registry);
    });

    afterAll(() => {
      validator?.dispose();
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("accepts valid TypeScript completion", async () => {
      const prefix = "function add(a: number, b: number): number {\n  return ";
      const completion = "a + b;";
      const suffix = "\n}";
      expect(
        await validator.validate(prefix, completion, suffix, "typescript"),
      ).toBe(true);
    });

    it("rejects TypeScript completion with syntax error", async () => {
      const prefix = "function add(a: number, b: number): number {\n  return ";
      const completion = "a + + + b; } } }";
      const suffix = "\n}";
      expect(
        await validator.validate(prefix, completion, suffix, "typescript"),
      ).toBe(false);
    });

    it("accepts valid Python completion", async () => {
      const prefix = "def greet(name):\n    ";
      const completion = "return f'Hello {name}'";
      const suffix = "\n";
      expect(
        await validator.validate(prefix, completion, suffix, "python"),
      ).toBe(true);
    });

    it("accepts completion in file that already has errors", async () => {
      const prefix = "const x = {\n  a: 1\n  // missing comma\n  b: ";
      const completion = "2";
      const suffix = "\n}";
      // File already has an error (missing comma), completion doesn't add more
      expect(
        await validator.validate(prefix, completion, suffix, "typescript"),
      ).toBe(true);
    });

    it("returns true for unmapped language", async () => {
      expect(await validator.validate("key: ", "value", "\n", "yaml")).toBe(
        true,
      );
    });

    it("accepts valid JavaScript completion", async () => {
      const prefix = "const arr = [1, 2, 3];\nconst sum = arr.";
      const completion = "reduce((a, b) => a + b, 0);";
      const suffix = "\nconsole.log(sum);";
      expect(
        await validator.validate(prefix, completion, suffix, "javascript"),
      ).toBe(true);
    });
  },
);

/**
 * CDN download tests — exercise the real runtime path.
 * Uses a GrammarRegistry that skips the local devDependency
 * and downloads from jsDelivr, then verifies the grammar works
 * and is byte-identical to the local devDependency copy.
 */
describe.skipIf(!process.env.LEYLINE_TEST_CDN)(
  "GrammarRegistry CDN download",
  { timeout: 30_000 },
  () => {
    let GrammarRegistry: typeof import("../src/tree-sitter.js").GrammarRegistry;
    let TreeSitterValidator: typeof import("../src/tree-sitter.js").TreeSitterValidator;
    let tmpDir: string;

    beforeAll(async () => {
      const mod = await import("../src/tree-sitter.js");
      GrammarRegistry = mod.GrammarRegistry;
      TreeSitterValidator = mod.TreeSitterValidator;
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "leyline-cdn-test-"));
    });

    afterAll(() => {
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("downloads TypeScript grammar from CDN and caches to disk", async () => {
      // Skip devDependency fallback to exercise the real CDN path
      const registry = new GrammarRegistry(tmpDir, undefined, false);
      const lang = await registry.getLanguage("typescript");
      expect(lang).not.toBeNull();

      // Verify the file was cached
      const cached = path.join(
        tmpDir,
        "grammars",
        "tree-sitter-typescript.wasm",
      );
      expect(fs.existsSync(cached)).toBe(true);
      expect(fs.statSync(cached).size).toBeGreaterThan(1000);
    });

    it("CDN grammar is byte-identical to devDependency", async () => {
      const cdnPath = path.join(
        tmpDir,
        "grammars",
        "tree-sitter-typescript.wasm",
      );
      const localPath = path.resolve(
        __dirname,
        "..",
        "node_modules",
        "@vscode",
        "tree-sitter-wasm",
        "wasm",
        "tree-sitter-typescript.wasm",
      );

      const cdnBytes = fs.readFileSync(cdnPath);
      const localBytes = fs.readFileSync(localPath);
      expect(cdnBytes.length).toBe(localBytes.length);
      expect(Buffer.compare(cdnBytes, localBytes)).toBe(0);
    });

    it("CDN-downloaded grammar validates completions correctly", async () => {
      // Uses cached grammar from previous test (no devDependency fallback)
      const registry = new GrammarRegistry(tmpDir, undefined, false);
      const validator = new TreeSitterValidator(registry);

      // Valid completion — should accept
      expect(
        await validator.validate(
          "function f(): number {\n  return ",
          "42;",
          "\n}",
          "typescript",
        ),
      ).toBe(true);

      // Invalid completion — should reject
      expect(
        await validator.validate(
          "function f(): number {\n  return ",
          "42; } } }",
          "\n}",
          "typescript",
        ),
      ).toBe(false);

      validator.dispose();
    });

    it("second load uses disk cache (no fetch)", async () => {
      let fetchCalled = false;
      const trackedFetch: typeof globalThis.fetch = async (...args) => {
        fetchCalled = true;
        return globalThis.fetch(...args);
      };
      // tmpDir already has the cached grammar from the first test
      const registry = new GrammarRegistry(tmpDir, trackedFetch, false);
      const lang = await registry.getLanguage("typescript");
      expect(lang).not.toBeNull();
      expect(fetchCalled).toBe(false);
    });
  },
);
