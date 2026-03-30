import * as fs from "node:fs";
import * as path from "node:path";
import { Language, Parser, type Tree } from "web-tree-sitter";
import { log } from "./log.js";

const GRAMMAR_PKG_VERSION = "0.3.0";
const GRAMMAR_CDN_BASE = `https://cdn.jsdelivr.net/npm/@vscode/tree-sitter-wasm@${GRAMMAR_PKG_VERSION}/wasm`;

export const LANG_TO_GRAMMAR: Readonly<Record<string, string>> = {
  typescript: "typescript",
  typescriptreact: "tsx",
  javascript: "javascript",
  javascriptreact: "javascript",
  java: "java",
  c: "c",
  cpp: "cpp",
  csharp: "c-sharp",
  go: "go",
  rust: "rust",
  python: "python",
};

export class GrammarRegistry {
  private readonly storagePath: string;
  private readonly languages = new Map<string, Language>();
  private readonly pending = new Map<string, Promise<Language | null>>();
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly useDevFallback: boolean;

  constructor(
    storagePath: string,
    fetchImpl?: typeof globalThis.fetch,
    useDevFallback = true,
  ) {
    this.storagePath = storagePath;
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
    this.useDevFallback = useDevFallback;
  }

  async getLanguage(grammarName: string): Promise<Language | null> {
    const cached = this.languages.get(grammarName);
    if (cached) return cached;

    const existing = this.pending.get(grammarName);
    if (existing) return existing;

    const promise = this.loadOrDownload(grammarName);
    this.pending.set(grammarName, promise);

    try {
      const lang = await promise;
      if (lang) this.languages.set(grammarName, lang);
      return lang;
    } finally {
      this.pending.delete(grammarName);
    }
  }

  private async loadOrDownload(grammarName: string): Promise<Language | null> {
    const grammarsDir = path.join(this.storagePath, "grammars");
    const fileName = `tree-sitter-${grammarName}.wasm`;
    const filePath = path.join(grammarsDir, fileName);

    try {
      // Check local devDependency first (for tests)
      if (this.useDevFallback && !fs.existsSync(filePath)) {
        const devPath = path.resolve(
          __dirname,
          "..",
          "node_modules",
          "@vscode",
          "tree-sitter-wasm",
          "wasm",
          fileName,
        );
        if (fs.existsSync(devPath)) {
          return await Language.load(devPath);
        }
      }

      // Cached on disk
      if (fs.existsSync(filePath)) {
        return await Language.load(filePath);
      }

      // Download from CDN
      const url = `${GRAMMAR_CDN_BASE}/${fileName}`;
      log()?.info(`Downloading Tree-sitter grammar: ${grammarName}`);

      const response = await this.fetchImpl(url);
      if (!response.ok) {
        log()?.warn(
          `Failed to download grammar ${grammarName}: ${response.status}`,
        );
        return null;
      }

      const buffer = new Uint8Array(await response.arrayBuffer());
      fs.mkdirSync(grammarsDir, { recursive: true });
      fs.writeFileSync(filePath, buffer);

      return await Language.load(filePath);
    } catch (err) {
      log()?.warn(
        `Grammar load failed for ${grammarName}: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }
}

export class TreeSitterValidator {
  private readonly registry: GrammarRegistry;
  private initPromise: Promise<void> | null = null;
  private parser: Parser | null = null;

  constructor(registry: GrammarRegistry) {
    this.registry = registry;
  }

  async validate(
    prefix: string,
    completion: string,
    suffix: string,
    languageId: string,
  ): Promise<boolean> {
    const grammarName = LANG_TO_GRAMMAR[languageId];
    if (!grammarName) return true;

    try {
      await this.ensureInit();
      if (!this.parser) return true;

      const language = await this.registry.getLanguage(grammarName);
      if (!language) return true;

      this.parser.setLanguage(language);

      const baseline = prefix + suffix;
      const withCompletion = prefix + completion + suffix;

      const baselineTree = this.parser.parse(baseline);
      const completionTree = this.parser.parse(withCompletion);

      if (!baselineTree || !completionTree) {
        baselineTree?.delete();
        completionTree?.delete();
        return true;
      }

      const baselineErrors = countErrors(baselineTree);
      const completionErrors = countErrors(completionTree);

      baselineTree.delete();
      completionTree.delete();

      if (completionErrors > baselineErrors) {
        log()?.debug(
          `Tree-sitter: rejected (baseline=${baselineErrors}, completion=${completionErrors})`,
        );
        return false;
      }

      return true;
    } catch (err) {
      log()?.warn(
        `Tree-sitter validation error for ${languageId}: ${err instanceof Error ? err.message : err}`,
      );
      return true;
    }
  }

  private async ensureInit(): Promise<void> {
    if (this.parser) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      try {
        await Parser.init({
          locateFile: (scriptName: string) => {
            // dist/ at runtime (esbuild copies the wasm there)
            const distPath = path.join(__dirname, scriptName);
            if (fs.existsSync(distPath)) return distPath;
            // Fallback: node_modules/ during vitest
            return path.join(
              __dirname,
              "..",
              "node_modules",
              "web-tree-sitter",
              scriptName,
            );
          },
        });
        this.parser = new Parser();
      } catch (err) {
        // Reset so next call can retry
        this.initPromise = null;
        throw err;
      }
    })();

    await this.initPromise;
  }

  dispose(): void {
    this.parser?.delete();
    this.parser = null;
    this.initPromise = null;
  }
}

export function countErrors(tree: Tree): number {
  let count = 0;
  const cursor = tree.walk();

  try {
    let reachedRoot = false;
    while (!reachedRoot) {
      if (cursor.nodeType === "ERROR" || cursor.currentNode.isMissing) {
        count++;
      }

      if (cursor.gotoFirstChild()) continue;
      if (cursor.gotoNextSibling()) continue;

      while (true) {
        if (!cursor.gotoParent()) {
          reachedRoot = true;
          break;
        }
        if (cursor.gotoNextSibling()) break;
      }
    }
  } finally {
    cursor.delete();
  }

  return count;
}
