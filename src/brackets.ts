const C_FAMILY = new Set([
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
  "swift",
  "kotlin",
  "scala",
  "php",
  "dart",
]);

const TEMPLATE_LANGS = new Set([
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
]);

const OPENERS: Record<string, string> = { "{": "}", "(": ")", "[": "]" };
const CLOSERS: Record<string, string> = { "}": "{", ")": "(", "]": "[" };

type ScanState =
  | "normal"
  | "single-string"
  | "double-string"
  | "template-string"
  | "line-comment"
  | "block-comment";

/**
 * Truncate a completion that closes more brackets than it opens, when those
 * excess closers duplicate characters already present in the suffix.
 *
 * Returns the completion unchanged for unknown languages or when no
 * overflow is detected.
 */
export function stripBracketOverflow(
  completion: string,
  suffix: string,
  languageId: string,
): string {
  if (!completion) return completion;

  let result: string;
  if (C_FAMILY.has(languageId)) {
    result = truncateExcessClosers(
      completion,
      suffix,
      TEMPLATE_LANGS.has(languageId),
    );
  } else if (languageId === "python") {
    result = truncateExcessClosers(completion, suffix, false);
  } else {
    return completion;
  }

  if (result.length < completion.length) {
    truncationCallback?.(completion.length - result.length);
  }
  return result;
}

let truncationCallback: ((charsRemoved: number) => void) | undefined;

export function onTruncation(cb: (charsRemoved: number) => void): void {
  truncationCallback = cb;
}

/**
 * Scan the completion for bracket balance. When a closer brings the running
 * balance below zero AND that closer character appears in the first non-empty
 * lines of the suffix, truncate at that position.
 */
function truncateExcessClosers(
  completion: string,
  suffix: string,
  supportTemplates: boolean,
): string {
  const suffixClosers = firstSuffixClosers(suffix, 5);
  if (suffixClosers.size === 0) return completion;

  const balance: Record<string, number> = { "{": 0, "(": 0, "[": 0 };
  let state: ScanState = "normal";
  let i = 0;

  while (i < completion.length) {
    const ch = completion[i];
    const next = i + 1 < completion.length ? completion[i + 1] : "";

    switch (state) {
      case "normal":
        if (ch === "/" && next === "/") {
          state = "line-comment";
          i += 2;
          continue;
        }
        if (ch === "/" && next === "*") {
          state = "block-comment";
          i += 2;
          continue;
        }
        if (ch === '"') {
          state = "double-string";
          i++;
          continue;
        }
        if (ch === "'") {
          state = "single-string";
          i++;
          continue;
        }
        if (supportTemplates && ch === "`") {
          state = "template-string";
          i++;
          continue;
        }
        if (ch === "#" && !supportTemplates) {
          // Python line comment
          state = "line-comment";
          i++;
          continue;
        }

        if (ch in OPENERS) {
          balance[ch]++;
        } else if (ch in CLOSERS) {
          const opener = CLOSERS[ch];
          balance[opener]--;
          if (balance[opener] < 0 && suffixClosers.has(ch)) {
            // Truncate at this position
            const truncated = completion.slice(0, i).trimEnd();
            return truncated || completion;
          }
        }
        break;

      case "double-string":
        if (ch === "\\") {
          i += 2;
          continue;
        }
        if (ch === '"') state = "normal";
        break;

      case "single-string":
        if (ch === "\\") {
          i += 2;
          continue;
        }
        if (ch === "'") state = "normal";
        break;

      case "template-string":
        if (ch === "\\") {
          i += 2;
          continue;
        }
        if (ch === "`") state = "normal";
        break;

      case "line-comment":
        if (ch === "\n") state = "normal";
        break;

      case "block-comment":
        if (ch === "*" && next === "/") {
          state = "normal";
          i += 2;
          continue;
        }
        break;

      default: {
        const _exhaustive: never = state;
        void _exhaustive;
      }
    }

    i++;
  }

  return completion;
}

/** Collect closing bracket characters from the first N non-empty suffix lines. */
function firstSuffixClosers(suffix: string, maxLines: number): Set<string> {
  const closers = new Set<string>();
  let count = 0;

  for (const line of suffix.split("\n")) {
    if (count >= maxLines) break;
    if (line.trim().length === 0) continue;
    count++;

    for (const ch of line) {
      if (ch in CLOSERS) closers.add(ch);
    }
  }

  return closers;
}
