import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDoc = {
  uri: { toString: () => string; fsPath: string; scheme: string };
  languageId: string;
  isUntitled: boolean;
  getText: () => string;
};

const { mockTextDocuments } = vi.hoisted(() => {
  const mockTextDocuments: MockDoc[] = [];
  return { mockTextDocuments };
});

vi.mock("vscode", () => ({
  workspace: {
    get textDocuments() {
      return mockTextDocuments;
    },
    getWorkspaceFolder: (uri: { fsPath: string }) => {
      if (uri.fsPath.startsWith("/project/")) {
        return { uri: { fsPath: "/project" } };
      }
      return undefined;
    },
    asRelativePath: (uri: { fsPath: string }, _includeWorkspace?: boolean) => {
      // POSIX workspace
      if (uri.fsPath.startsWith("/project/")) {
        return uri.fsPath.slice("/project/".length);
      }
      // Windows workspace
      if (uri.fsPath.startsWith("C:\\project\\")) {
        return uri.fsPath.slice("C:\\project\\".length);
      }
      return uri.fsPath;
    },
  },
  languages: {
    match: () => 0,
  },
}));

import {
  collectCrossFileContext,
  estimateTokens,
  extractSignatures,
  parseImports,
  trackRecentEdit,
} from "../src/context.js";

function makeDoc(
  path: string,
  languageId: string,
  content: string,
): (typeof mockTextDocuments)[0] {
  return {
    uri: {
      toString: () => `file://${path}`,
      fsPath: path,
      scheme: "file",
    },
    languageId,
    isUntitled: false,
    getText: () => content,
  };
}

function makeVscodeDoc(path: string, languageId: string, content: string) {
  const doc = makeDoc(path, languageId, content);
  return doc as unknown as import("vscode").TextDocument;
}

// ─── estimateTokens ───

describe("estimateTokens", () => {
  it("approximates 1 token per 4 chars", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });

  it("handles multi-line text", () => {
    expect(estimateTokens("a".repeat(100))).toBe(25);
  });
});

// ─── extractSignatures ───

describe("extractSignatures", () => {
  it("extracts TypeScript imports and exports", () => {
    const text = [
      'import { User } from "./types";',
      "",
      "export interface Config {",
      "  host: string;",
      "  port: number;",
      "}",
      "",
      "export function loadConfig(): Config {",
      "  return { host: 'localhost', port: 3000 };",
      "}",
    ].join("\n");

    const result = extractSignatures(text, 20);
    expect(result).toContain('import { User } from "./types"');
    expect(result).toContain("export interface Config {");
    expect(result).toContain("export function loadConfig(): Config {");
    expect(result).not.toContain("return {");
  });

  it("extracts Python imports and defs", () => {
    const text = [
      "from typing import List",
      "import os",
      "",
      "def process(items: List[str]) -> List[str]:",
      "    result = []",
      "    return result",
    ].join("\n");

    const result = extractSignatures(text, 20);
    expect(result).toContain("from typing import List");
    expect(result).toContain("import os");
    expect(result).toContain("def process(items: List[str])");
    expect(result).not.toContain("result = []");
  });

  it("extracts Go package and func", () => {
    const text = [
      "package main",
      "",
      'import "fmt"',
      "",
      "func greet(name string) string {",
      '  return fmt.Sprintf("Hello, %s!", name)',
      "}",
    ].join("\n");

    const result = extractSignatures(text, 20);
    expect(result).toContain("package main");
    expect(result).toContain('import "fmt"');
    expect(result).toContain("func greet(name string)");
    expect(result).not.toContain("return fmt.Sprintf");
  });

  it("respects maxLines limit", () => {
    const text = [
      "import a from 'a';",
      "import b from 'b';",
      "import c from 'c';",
      "export const x = 1;",
      "export const y = 2;",
    ].join("\n");

    const result = extractSignatures(text, 3);
    expect(result.split("\n").length).toBe(3);
  });

  it("returns empty string for files with no signatures", () => {
    const text = "// just a comment\n/* block */\n  x + y;\n";
    expect(extractSignatures(text, 20)).toBe("");
  });

  it("extracts const declarations", () => {
    expect(
      extractSignatures("const API_URL = 'https://api.example.com';", 10),
    ).toContain("const API_URL");
  });

  it("extracts Rust use and pub", () => {
    const text = 'use std::io;\npub fn main() {\n  println!("hello");\n}';
    const result = extractSignatures(text, 10);
    expect(result).toContain("use std::io;");
    expect(result).toContain("pub fn main()");
  });

  it("extracts Java imports and class/interface", () => {
    const text = [
      "import java.util.List;",
      "import java.util.stream.Collectors;",
      "",
      "public class UserService {",
      "  private final List<User> users;",
      "  public List<User> getActive() {",
      "    return users.stream().filter(User::isActive).toList();",
      "  }",
      "}",
    ].join("\n");

    const result = extractSignatures(text, 20);
    expect(result).toContain("import java.util.List;");
    expect(result).toContain("import java.util.stream.Collectors;");
    expect(result).toContain("class UserService {");
    expect(result).not.toContain("return users.stream()");
  });

  it("extracts C function and type declarations", () => {
    const text = [
      "#include <stdio.h>",
      "",
      "typedef struct { int x; int y; } Point;",
      "",
      "Point point_new(int x, int y) {",
      "  return (Point){ .x = x, .y = y };",
      "}",
    ].join("\n");

    const result = extractSignatures(text, 20);
    expect(result).toContain("type"); // typedef matches "type "
    expect(result).not.toContain("return (Point)");
  });
});

// ─── parseImports ───

describe("parseImports", () => {
  describe("TypeScript/JavaScript", () => {
    it("parses ES import paths", () => {
      const prefix = [
        'import { User } from "./types";',
        'import { Config } from "../config";',
        'import * as utils from "./utils";',
      ].join("\n");

      const paths = parseImports(prefix, "typescript");
      expect(paths.has("./types")).toBe(true);
      expect(paths.has("../config")).toBe(true);
      expect(paths.has("./utils")).toBe(true);
    });

    it("parses require paths", () => {
      const prefix =
        'const fs = require("fs");\nconst utils = require("./utils");';
      const paths = parseImports(prefix, "javascript");
      expect(paths.has("fs")).toBe(true);
      expect(paths.has("./utils")).toBe(true);
    });

    it("works with typescriptreact", () => {
      const paths = parseImports(
        'import React from "react";',
        "typescriptreact",
      );
      expect(paths.has("react")).toBe(true);
    });

    it("works with javascriptreact", () => {
      const paths = parseImports(
        'import { useState } from "react";',
        "javascriptreact",
      );
      expect(paths.has("react")).toBe(true);
    });

    it("returns empty set for no imports", () => {
      expect(parseImports("const x = 1;", "typescript").size).toBe(0);
    });
  });

  describe("Python", () => {
    it("parses from...import", () => {
      const paths = parseImports(
        "from typing import List\nfrom os.path import join",
        "python",
      );
      expect(paths.has("typing")).toBe(true);
      expect(paths.has("os.path")).toBe(true);
    });

    it("parses import statements", () => {
      const paths = parseImports("import os\nimport json", "python");
      expect(paths.has("os")).toBe(true);
      expect(paths.has("json")).toBe(true);
    });
  });

  describe("Go", () => {
    it("parses import paths", () => {
      const paths = parseImports(
        'import (\n  "fmt"\n  "os"\n  "github.com/user/pkg"\n)',
        "go",
      );
      expect(paths.has("fmt")).toBe(true);
      expect(paths.has("os")).toBe(true);
      expect(paths.has("github.com/user/pkg")).toBe(true);
    });
  });

  describe("Java", () => {
    it("parses import statements", () => {
      const paths = parseImports(
        "import java.util.List;\nimport com.example.User;",
        "java",
      );
      expect(paths.has("java.util.List")).toBe(true);
      expect(paths.has("com.example.User")).toBe(true);
    });
  });

  describe("Rust", () => {
    it("parses use statements", () => {
      const paths = parseImports(
        "use std::io;\nuse crate::types::Config;",
        "rust",
      );
      expect(paths.has("std::io")).toBe(true);
      expect(paths.has("crate::types::Config")).toBe(true);
    });
  });

  describe("C/C++", () => {
    it("parses local #include paths", () => {
      const paths = parseImports(
        '#include "point.h"\n#include "utils.h"\n#include <stdio.h>',
        "c",
      );
      expect(paths.has("point.h")).toBe(true);
      expect(paths.has("utils.h")).toBe(true);
      // System includes (<...>) are not matched — only local ("...")
      expect(paths.has("stdio.h")).toBe(false);
    });

    it("works with cpp language id", () => {
      const paths = parseImports('#include "vector.h"', "cpp");
      expect(paths.has("vector.h")).toBe(true);
    });
  });

  describe("unsupported languages", () => {
    it("returns empty set for unknown language", () => {
      expect(parseImports("something", "plaintext").size).toBe(0);
    });
  });
});

// ─── collectCrossFileContext ───

describe("collectCrossFileContext", () => {
  beforeEach(() => {
    mockTextDocuments.length = 0;
  });

  it("returns empty string when no other docs are open", () => {
    const doc = makeVscodeDoc(
      "/project/src/main.ts",
      "typescript",
      "const x = 1;",
    );
    mockTextDocuments.push(
      makeDoc("/project/src/main.ts", "typescript", "const x = 1;"),
    );

    const result = collectCrossFileContext(doc, "const x = ", 500);
    expect(result).toBe("");
  });

  it("includes open docs in same language", () => {
    const currentDoc = makeDoc(
      "/project/src/main.ts",
      "typescript",
      "const x = 1;",
    );
    const otherDoc = makeDoc(
      "/project/src/types.ts",
      "typescript",
      "export interface User {\n  id: number;\n  name: string;\n}\n",
    );

    mockTextDocuments.push(currentDoc, otherDoc);

    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", "const x = 1;"),
      "const x = ",
      500,
    );

    expect(result).toContain("// File: src/types.ts");
    expect(result).toContain("export interface User {");
  });

  it("excludes docs in different language", () => {
    const currentDoc = makeDoc(
      "/project/src/main.ts",
      "typescript",
      "const x = 1;",
    );
    const pythonDoc = makeDoc(
      "/project/src/utils.py",
      "python",
      "def helper():\n    pass\n",
    );

    mockTextDocuments.push(currentDoc, pythonDoc);

    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", "const x = 1;"),
      "const x = ",
      500,
    );

    expect(result).toBe("");
  });

  it("prioritizes imported files over open tabs", () => {
    const currentDoc = makeDoc("/project/src/main.ts", "typescript", "");
    const importedDoc = makeDoc(
      "/project/src/types.ts",
      "typescript",
      "export interface User { id: number; }\n",
    );
    const otherDoc = makeDoc(
      "/project/src/unrelated.ts",
      "typescript",
      "export const FOO = 1;\n",
    );

    mockTextDocuments.push(currentDoc, importedDoc, otherDoc);

    const prefix = 'import { User } from "./types";\n\nconst u: User = ';
    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", ""),
      prefix,
      500,
    );

    // Imported file should come first
    const typesIdx = result.indexOf("types.ts");
    const unrelatedIdx = result.indexOf("unrelated.ts");
    expect(typesIdx).toBeGreaterThan(-1);
    expect(unrelatedIdx).toBeGreaterThan(-1);
    expect(typesIdx).toBeLessThan(unrelatedIdx);
  });

  it("prioritizes recently edited files", () => {
    const currentDoc = makeDoc("/project/src/main.ts", "typescript", "");
    const recentDoc = makeDoc(
      "/project/src/recent.ts",
      "typescript",
      "export function justEdited(): void {}\n",
    );
    const oldDoc = makeDoc(
      "/project/src/old.ts",
      "typescript",
      "export function notEdited(): void {}\n",
    );

    mockTextDocuments.push(currentDoc, recentDoc, oldDoc);

    // Track recent edit
    trackRecentEdit({
      toString: () => "file:///project/src/recent.ts",
    } as unknown as import("vscode").Uri);

    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", ""),
      "const x = ",
      500,
    );

    const recentIdx = result.indexOf("recent.ts");
    const oldIdx = result.indexOf("old.ts");
    expect(recentIdx).toBeGreaterThan(-1);
    expect(oldIdx).toBeGreaterThan(-1);
    expect(recentIdx).toBeLessThan(oldIdx);
  });

  it("respects token budget", () => {
    const currentDoc = makeDoc("/project/src/main.ts", "typescript", "");
    // Create a doc with lots of signatures
    const bigContent = Array.from(
      { length: 50 },
      (_, i) => `export function fn${i}(x: number): number {}`,
    ).join("\n");
    const bigDoc = makeDoc("/project/src/big.ts", "typescript", bigContent);

    mockTextDocuments.push(currentDoc, bigDoc);

    // Very small budget
    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", ""),
      "const x = ",
      20, // ~80 chars
    );

    // Should include something but be truncated
    expect(result.length).toBeLessThan(bigContent.length);
  });

  it("returns empty when maxTokens is 0", () => {
    const currentDoc = makeDoc("/project/src/main.ts", "typescript", "");
    const otherDoc = makeDoc(
      "/project/src/types.ts",
      "typescript",
      "export interface User {}\n",
    );
    mockTextDocuments.push(currentDoc, otherDoc);

    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", ""),
      "const x = ",
      0,
    );
    expect(result).toBe("");
  });

  it("skips untitled documents", () => {
    const currentDoc = makeDoc("/project/src/main.ts", "typescript", "");
    const untitled = {
      uri: {
        toString: () => "untitled:1",
        fsPath: "untitled:1",
        scheme: "untitled",
      },
      languageId: "typescript",
      isUntitled: true,
      getText: () => "export const x = 1;\n",
    };

    mockTextDocuments.push(currentDoc, untitled);

    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", ""),
      "const x = ",
      500,
    );
    expect(result).toBe("");
  });

  it("skips non-file schemes (e.g., git, output)", () => {
    const currentDoc = makeDoc("/project/src/main.ts", "typescript", "");
    const gitDoc = {
      uri: {
        toString: () => "git:/project/src/types.ts",
        fsPath: "/project/src/types.ts",
        scheme: "git",
      },
      languageId: "typescript",
      isUntitled: false,
      getText: () => "export interface User {}\n",
    };

    mockTextDocuments.push(currentDoc, gitDoc);

    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", ""),
      "const x = ",
      500,
    );
    expect(result).toBe("");
  });

  it("skips files with no extractable signatures", () => {
    const currentDoc = makeDoc("/project/src/main.ts", "typescript", "");
    const emptyDoc = makeDoc(
      "/project/src/empty.ts",
      "typescript",
      "// just comments\n/* nothing useful */\n",
    );

    mockTextDocuments.push(currentDoc, emptyDoc);

    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", ""),
      "const x = ",
      500,
    );
    expect(result).toBe("");
  });

  it("formats snippets with file path comments", () => {
    const currentDoc = makeDoc("/project/src/main.ts", "typescript", "");
    const otherDoc = makeDoc(
      "/project/src/utils.ts",
      "typescript",
      "export function helper(): void {}\n",
    );

    mockTextDocuments.push(currentDoc, otherDoc);

    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", ""),
      "const x = ",
      500,
    );

    expect(result).toMatch(/^\/\/ File: src\/utils\.ts\n/);
  });

  it("uses # comment for Python files", () => {
    const currentDoc = makeDoc("/project/src/main.py", "python", "");
    const otherDoc = makeDoc(
      "/project/src/utils.py",
      "python",
      "def helper():\n    pass\n",
    );

    mockTextDocuments.push(currentDoc, otherDoc);

    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.py", "python", ""),
      "import utils\nx = ",
      500,
    );

    expect(result).toMatch(/^# File: src\/utils\.py\n/);
    expect(result).not.toContain("// File:");
  });

  it("includes typescriptreact files for typescript docs", () => {
    const currentDoc = makeDoc("/project/src/main.ts", "typescript", "");
    const tsxDoc = makeDoc(
      "/project/src/Button.tsx",
      "typescriptreact",
      "export function Button(): JSX.Element {}\n",
    );

    mockTextDocuments.push(currentDoc, tsxDoc);

    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", ""),
      "const x = ",
      500,
    );

    expect(result).toContain("Button.tsx");
    expect(result).toContain("export function Button()");
  });

  it("skips large snippet but includes smaller ones", () => {
    const currentDoc = makeDoc("/project/src/main.ts", "typescript", "");
    const bigDoc = makeDoc(
      "/project/src/big.ts",
      "typescript",
      Array.from(
        { length: 100 },
        (_, i) => `export function fn${i}(): void {}`,
      ).join("\n"),
    );
    const smallDoc = makeDoc(
      "/project/src/small.ts",
      "typescript",
      "export const VERSION = 1;\n",
    );

    mockTextDocuments.push(currentDoc, bigDoc, smallDoc);

    // Budget too small for bigDoc but enough for smallDoc
    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.ts", "typescript", ""),
      "const x = ",
      15,
    );

    expect(result).toContain("small.ts");
    expect(result).not.toContain("big.ts");
  });

  it("matches Java import by last segment", () => {
    const currentDoc = makeDoc("/project/src/Main.java", "java", "");
    const userDoc = makeDoc(
      "/project/src/User.java",
      "java",
      "public class User {\n  public String name;\n}\n",
    );

    mockTextDocuments.push(currentDoc, userDoc);

    const prefix = "import com.example.User;\n\nUser u = ";
    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/Main.java", "java", ""),
      prefix,
      500,
    );

    // User.java should be prioritized as imported
    expect(result).toContain("User.java");
  });

  it("matches Rust use by last segment", () => {
    const currentDoc = makeDoc("/project/src/main.rs", "rust", "");
    const configDoc = makeDoc(
      "/project/src/config.rs",
      "rust",
      "pub struct Config {\n  pub host: String,\n}\n",
    );

    mockTextDocuments.push(currentDoc, configDoc);

    const prefix = "use crate::config::Config;\n\nlet c: Config = ";
    const result = collectCrossFileContext(
      makeVscodeDoc("/project/src/main.rs", "rust", ""),
      prefix,
      500,
    );

    expect(result).toContain("config.rs");
  });

  describe("Windows path handling", () => {
    function makeWinDoc(
      winPath: string,
      languageId: string,
      content: string,
    ): (typeof mockTextDocuments)[0] {
      return {
        uri: {
          toString: () => `file:///${winPath.replace(/\\/g, "/")}`,
          fsPath: winPath,
          scheme: "file",
        },
        languageId,
        isUntitled: false,
        getText: () => content,
      };
    }

    it("renders file path with forward slashes on Windows paths", () => {
      const currentDoc = makeWinDoc(
        "C:\\project\\src\\main.ts",
        "typescript",
        "const x = 1;",
      );
      const otherDoc = makeWinDoc(
        "C:\\project\\src\\types.ts",
        "typescript",
        "export interface User { id: number; }\n",
      );

      mockTextDocuments.push(currentDoc, otherDoc);

      const result = collectCrossFileContext(
        {
          uri: currentDoc.uri as unknown as import("vscode").Uri,
          languageId: "typescript",
        } as import("vscode").TextDocument,
        "const x = ",
        500,
      );

      expect(result).toContain("// File: src/types.ts");
      expect(result).not.toContain("\\");
    });

    it("matches Windows import paths via forward-slash normalization", () => {
      const currentDoc = makeWinDoc(
        "C:\\project\\src\\main.ts",
        "typescript",
        "",
      );
      const typesDoc = makeWinDoc(
        "C:\\project\\src\\types.ts",
        "typescript",
        "export interface User { id: number; }\n",
      );

      mockTextDocuments.push(currentDoc, typesDoc);

      const prefix = 'import { User } from "./types";\n\nconst u: User = ';
      const result = collectCrossFileContext(
        {
          uri: currentDoc.uri as unknown as import("vscode").Uri,
          languageId: "typescript",
        } as import("vscode").TextDocument,
        prefix,
        500,
      );

      // types.ts should be included and matched as imported
      expect(result).toContain("types.ts");
    });
  });
});
