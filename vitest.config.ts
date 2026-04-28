import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const treeSitterWasmVersion = JSON.parse(
  readFileSync("node_modules/@vscode/tree-sitter-wasm/package.json", "utf8"),
).version;

export default defineConfig({
  define: {
    TREE_SITTER_WASM_VERSION: JSON.stringify(treeSitterWasmVersion),
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
  benchmark: {
    include: ["test/**/*.bench.ts"],
  },
  plugins: [
    {
      name: "vscode-resolve",
      resolveId(id) {
        if (id === "vscode") return "\0vscode";
      },
      load(id) {
        if (id === "\0vscode") return "export default {};";
      },
    },
  ],
});
