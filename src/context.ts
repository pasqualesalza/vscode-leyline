import * as vscode from "vscode";
import { log } from "./log.js";

interface Snippet {
  path: string;
  content: string;
  priority: number; // higher = more relevant
}

/** Approximate token count (1 token ≈ 4 chars). */
/** @internal Exported for testing. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Get workspace-relative path for display. */
function relativePath(uri: vscode.Uri): string {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (folder) {
    return uri.fsPath.slice(folder.uri.fsPath.length + 1);
  }
  return uri.fsPath.split("/").slice(-2).join("/");
}

/**
 * Extract the first N lines that contain imports and signatures
 * (function/class/interface/type declarations). Skips blank lines
 * and implementation details.
 */
/** @internal Exported for testing. */
export function extractSignatures(text: string, maxLines: number): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    if (result.length >= maxLines) break;
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (
      /^(import |export |from |require\(|type|interface |class |function |const |def |func |pub |use |package |module |public |private |protected |struct |enum |trait |#include |#define )/.test(
        trimmed,
      )
    ) {
      result.push(line);
    }
  }

  return result.join("\n");
}

/**
 * Parse import paths from the current file's prefix.
 * Returns a set of normalized module paths.
 */
/** @internal Exported for testing. */
export function parseImports(prefix: string, languageId: string): Set<string> {
  const paths = new Set<string>();

  let re: RegExp | undefined;

  if (
    languageId === "typescript" ||
    languageId === "typescriptreact" ||
    languageId === "javascript" ||
    languageId === "javascriptreact"
  ) {
    re = /(?:from\s+|require\s*\(\s*)["']([^"']+)["']/g;
  } else if (languageId === "python") {
    re = /(?:from\s+|import\s+)([\w.]+)/g;
  } else if (languageId === "go") {
    re = /"([^"]+)"/g;
  } else if (languageId === "java") {
    re = /import\s+([\w.]+)/g;
  } else if (languageId === "rust") {
    re = /use\s+([\w:]+)/g;
  } else if (languageId === "c" || languageId === "cpp") {
    re = /#include\s+"([^"]+)"/g;
  }

  if (re) {
    for (const m of prefix.matchAll(re)) {
      paths.add(m[1]);
    }
  }

  return paths;
}

/**
 * Check if a document's path matches any of the imported module paths.
 */
function matchesImport(docUri: vscode.Uri, importPaths: Set<string>): boolean {
  const docPath = docUri.fsPath;
  // Also check just the filename without extension for fuzzy matching
  const docBasename =
    docPath
      .split("/")
      .pop()
      ?.replace(/\.\w+$/, "") ?? "";

  for (const imp of importPaths) {
    // Strip leading ./ and file extension
    const normalized = imp.replace(/^\.\//, "").replace(/\.\w+$/, "");

    // Direct path substring match (works for TS/JS relative imports)
    if (normalized && docPath.includes(normalized)) return true;

    // Last segment match: "com.example.User" → "User", "crate::types::Config" → "Config"
    const lastSegment = normalized.split(/[.:/]/).pop() ?? "";
    if (
      lastSegment &&
      lastSegment.length > 1 &&
      docBasename.toLowerCase() === lastSegment.toLowerCase()
    ) {
      return true;
    }
  }
  return false;
}

/** Track recently edited files. */
const recentEdits = new Map<string, number>();
const RECENT_EDIT_TTL_MS = 60_000;

export function trackRecentEdit(uri: vscode.Uri): void {
  recentEdits.set(uri.toString(), Date.now());
  const cutoff = Date.now() - RECENT_EDIT_TTL_MS;
  for (const [key, ts] of recentEdits) {
    if (ts < cutoff) recentEdits.delete(key);
  }
}

function isRecentlyEdited(uri: vscode.Uri): boolean {
  const ts = recentEdits.get(uri.toString());
  return ts !== undefined && Date.now() - ts < RECENT_EDIT_TTL_MS;
}

const LANGUAGE_GROUPS: Record<string, string> = {
  typescript: "ts",
  typescriptreact: "ts",
  javascript: "js",
  javascriptreact: "js",
};

function isCompatibleLanguage(a: string, b: string): boolean {
  if (a === b) return true;
  const groupA = LANGUAGE_GROUPS[a];
  const groupB = LANGUAGE_GROUPS[b];
  return groupA !== undefined && groupA === groupB;
}

/**
 * Collect cross-file context from open documents.
 *
 * Returns relevant code snippets from other files, formatted with
 * file-path comments, ready to prepend to the FIM prefix.
 */
export function collectCrossFileContext(
  document: vscode.TextDocument,
  prefix: string,
  maxTokens: number,
): string {
  if (maxTokens <= 0) return "";

  const currentUri = document.uri.toString();
  const languageId = document.languageId;
  const importPaths = parseImports(prefix, languageId);
  const openDocs = vscode.workspace.textDocuments;

  const snippets: Snippet[] = [];

  for (const doc of openDocs) {
    if (doc.uri.toString() === currentUri) continue;
    if (doc.uri.scheme !== "file") continue;
    if (doc.isUntitled) continue;
    if (!isCompatibleLanguage(doc.languageId, languageId)) continue;

    const isImported = matchesImport(doc.uri, importPaths);
    const isRecent = isRecentlyEdited(doc.uri);

    let priority = 1;
    if (isRecent) priority += 2;
    if (isImported) priority += 4;

    const signatures = extractSignatures(doc.getText(), 20);
    if (!signatures.trim()) continue;

    const path = relativePath(doc.uri);
    const label = isRecent ? `${path} (recently edited)` : path;

    snippets.push({ path: label, content: signatures, priority });
  }

  if (snippets.length === 0) return "";

  snippets.sort((a, b) => b.priority - a.priority);

  const parts: string[] = [];
  let usedTokens = 0;

  const commentPrefix = languageId === "python" ? "#" : "//";

  for (const snippet of snippets) {
    const formatted = `${commentPrefix} File: ${snippet.path}\n${snippet.content}`;
    const tokens = estimateTokens(formatted);
    if (usedTokens + tokens > maxTokens) {
      // Skip large snippet but try smaller ones
      continue;
    }
    parts.push(formatted);
    usedTokens += tokens;
  }

  if (parts.length === 0) return "";

  const result = parts.join("\n\n");
  log()?.debug(
    `Cross-file context: ${parts.length} files, ~${usedTokens} tokens`,
  );
  return result;
}
