const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

const watch = process.argv.includes("--watch");
const production = process.argv.includes("--production");

/** @type {import('esbuild').Plugin} */
const copyWasmPlugin = {
  name: "copy-wasm",
  setup(build) {
    build.onEnd(() => {
      const src = path.join(
        __dirname,
        "node_modules/web-tree-sitter/web-tree-sitter.wasm",
      );
      const dest = path.join(__dirname, "dist/web-tree-sitter.wasm");
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      } else {
        console.warn(
          "[copy-wasm] web-tree-sitter.wasm not found — Tree-sitter will not work at runtime",
        );
      }
    });
  },
};

/** @type {import('esbuild').Plugin} */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",
  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      for (const { text, location } of result.errors) {
        console.error(
          `> ${location.file}:${location.line}:${location.column}: error: ${text}`,
        );
      }
      console.log("[watch] build finished");
    });
  },
};

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "silent",
    plugins: [copyWasmPlugin, esbuildProblemMatcherPlugin],
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
