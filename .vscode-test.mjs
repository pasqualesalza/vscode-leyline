import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/test-e2e/**/*.test.js",
  extensionDevelopmentPath: ".",
  launchArgs: ["--disable-extensions"],
  mocha: {
    timeout: 15000,
  },
});
