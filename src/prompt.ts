export function extractContext(
  text: string,
  offset: number,
  prefixLineCount: number,
  suffixLineCount: number,
): { prefix: string; suffix: string } {
  const before = text.slice(0, offset);
  const after = text.slice(offset);

  const prefixLines = before.split("\n");
  const truncatedPrefix =
    prefixLines.length > prefixLineCount
      ? prefixLines.slice(-prefixLineCount).join("\n")
      : before;

  const suffixLines = after.split("\n");
  const truncatedSuffix =
    suffixLines.length > suffixLineCount
      ? suffixLines.slice(0, suffixLineCount).join("\n")
      : after;

  return { prefix: truncatedPrefix, suffix: truncatedSuffix };
}

/**
 * Remove the trailing portion of a completion that overlaps with the
 * beginning of the suffix (character-level).  This handles the common case
 * where the FIM model regenerates code that already exists after the cursor.
 */
export function stripOverlap(completion: string, suffix: string): string {
  if (!completion || !suffix) return completion;

  const maxLen = Math.min(completion.length, suffix.length);
  let overlapLen = 0;

  for (let len = 1; len <= maxLen; len++) {
    if (completion.slice(-len) === suffix.slice(0, len)) {
      overlapLen = len;
    }
  }

  return overlapLen > 0 ? completion.slice(0, -overlapLen) : completion;
}

/**
 * Remove trailing lines from the completion that duplicate the first
 * non-empty lines of the suffix (line-level, whitespace-insensitive).
 *
 * This covers cases where char-level overlap misses due to differing
 * indentation (e.g., `}` vs `  }`).
 */
export function stripDuplicateLines(
  completion: string,
  suffix: string,
): string {
  if (!completion || !suffix) return completion;

  const completionLines = completion.split("\n");
  const suffixNonEmpty = suffix
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (suffixNonEmpty.length === 0) return completion;

  let bestMatch = 0;

  for (
    let n = 1;
    n <= Math.min(completionLines.length, suffixNonEmpty.length);
    n++
  ) {
    const tailSlice = completionLines.slice(-n);
    const headSlice = suffixNonEmpty.slice(0, n);

    const allMatch = tailSlice.every(
      (line, i) => line.trim() === headSlice[i].trim(),
    );

    if (allMatch) {
      bestMatch = n;
    }
  }

  if (bestMatch === 0) return completion;

  return completionLines.slice(0, -bestMatch).join("\n");
}

/** Compute the visual column width of a whitespace-only string. */
export function visualWidth(whitespace: string, tabSize: number): number {
  let width = 0;
  for (const ch of whitespace) {
    if (ch === "\t") {
      width += tabSize - (width % tabSize);
    } else {
      width++;
    }
  }
  return width;
}

/**
 * Strip duplicated leading indentation from the first line of a completion.
 *
 * When the cursor sits in the indentation zone of a line (i.e. everything
 * before the cursor is whitespace), FIM models sometimes re-emit that
 * indentation, causing double-indent on insertion.
 *
 * The fix only fires when `currentLinePrefix` is non-empty **and**
 * whitespace-only — column 0 and mid-code positions are left untouched.
 *
 * Two passes:
 * 1. Exact string match — fast path for the common case.
 * 2. Column-width match — handles tab/space mismatches (e.g. editor uses
 *    tabs but model emits spaces). Only strips when the column widths
 *    align exactly to avoid breaking intentional indentation.
 */
export function stripLeadingIndent(
  completion: string,
  currentLinePrefix: string,
  tabSize = 4,
): string {
  if (!completion) return completion;

  // Only strip when the cursor is in a whitespace-only zone
  if (currentLinePrefix.length === 0 || currentLinePrefix.trim().length > 0) {
    return completion;
  }

  const nl = completion.indexOf("\n");
  const first = nl === -1 ? completion : completion.slice(0, nl);
  const rest = nl === -1 ? "" : completion.slice(nl);

  // Fast path: exact string match
  if (first.startsWith(currentLinePrefix)) {
    return first.slice(currentLinePrefix.length) + rest;
  }

  // Fallback: compare by visual column width (tab/space mismatch)
  const prefixWidth = visualWidth(currentLinePrefix, tabSize);
  let cols = 0;
  let i = 0;
  while (i < first.length && cols < prefixWidth) {
    if (first[i] === "\t") {
      cols += tabSize - (cols % tabSize);
    } else if (first[i] === " ") {
      cols++;
    } else {
      break; // hit non-whitespace before reaching target width
    }
    i++;
  }

  // Only strip when columns align exactly
  if (cols === prefixWidth) {
    return first.slice(i) + rest;
  }

  return completion;
}

/**
 * Detect and truncate repetitive blocks in a completion.
 *
 * FIM models sometimes enter a loop, generating the same block of lines
 * over and over. This scans for the first pair of consecutive identical
 * blocks (≥ 2 non-empty lines) and truncates at the end of the first
 * occurrence.
 */
export function stripRepetition(completion: string): string {
  const lines = completion.split("\n");
  if (lines.length < 4) return completion;

  for (
    let blockSize = 2;
    blockSize <= Math.floor(lines.length / 2);
    blockSize++
  ) {
    for (let i = 0; i + 2 * blockSize <= lines.length; i++) {
      const block1 = lines.slice(i, i + blockSize);
      const block2 = lines.slice(i + blockSize, i + 2 * blockSize);

      // Skip blocks that are all whitespace / empty
      if (block1.every((line) => line.trim().length === 0)) continue;

      const match = block1.every((line, j) => line.trim() === block2[j].trim());
      if (match) {
        return lines.slice(0, i + blockSize).join("\n");
      }
    }
  }

  return completion;
}

/**
 * Suppress a completion whose non-empty lines duplicate a contiguous block
 * already present in the prefix (text before the cursor).
 *
 * FIM models sometimes re-emit a function or block that already exists in the
 * visible context. When ≥ 2 non-trivial lines of the completion match a
 * contiguous run in the prefix (whitespace-insensitive), the completion is
 * replaced with an empty string so it gets discarded upstream.
 */
export function stripPrefixDuplicate(
  completion: string,
  prefix: string,
): string {
  if (!completion || !prefix) return completion;

  const compNonEmpty = completion
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (compNonEmpty.length < 2) return completion;

  const prefixLines = prefix.split("\n");

  for (let i = 0; i <= prefixLines.length - compNonEmpty.length; i++) {
    let prefIdx = i;
    let matched = 0;

    for (const compLine of compNonEmpty) {
      // Skip blank prefix lines
      while (
        prefIdx < prefixLines.length &&
        prefixLines[prefIdx].trim().length === 0
      ) {
        prefIdx++;
      }
      if (prefIdx >= prefixLines.length) break;
      if (compLine.trim() !== prefixLines[prefIdx].trim()) break;
      matched++;
      prefIdx++;
    }

    if (matched === compNonEmpty.length) return "";
  }

  return completion;
}

/**
 * Post-process FIM completion to remove suffix overlap.
 *
 * FIM models sometimes regenerate text already present after the cursor.
 * This is standard practice in production tools (Sourcegraph Cody, Continue.dev, Minuet-AI).
 *
 * @see https://arxiv.org/abs/2410.03103 — Horizon-Length Prediction
 * @see https://arxiv.org/abs/2403.04814 — SAFIM (ICML 2024)
 */
export function postProcess(
  completion: string,
  prefix: string,
  suffix: string,
): string {
  // 1. Remove internal repetition (model looping).
  let result = stripRepetition(completion);

  // 2. Strip suffix overlap (char + line level, iterative).
  const MAX_PASSES = 3;
  for (let i = 0; i < MAX_PASSES; i++) {
    const next = stripDuplicateLines(stripOverlap(result, suffix), suffix);
    if (next === result) break;
    result = next;
  }

  // 3. Suppress completions that duplicate code already in the prefix.
  //    Runs last so that suffix-overlap stripping has already removed
  //    trailing braces/lines that would prevent a clean match.
  return stripPrefixDuplicate(result, prefix);
}
