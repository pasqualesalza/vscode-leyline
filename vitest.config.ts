import { defineConfig } from "vitest/config";

export default defineConfig({
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
