/**
 * Detect whether the cursor position suggests a multi-line completion.
 *
 * Returns true when the cursor is at the start of an empty block body
 * (function, class, if, for, etc.) or inside a docstring/JSDoc comment.
 * In these cases the stop sequence `\n\n` should be removed so the model
 * can generate a full block rather than stopping at the first blank line.
 *
 * This is a text-based heuristic — no AST/Tree-sitter required.
 */
export function shouldMultiline(prefix: string, languageId: string): boolean {
  const lines = prefix.split("\n");
  const lastLine = lines[lines.length - 1];
  const prevLine = lines.length >= 2 ? lines[lines.length - 2] : "";
  const trimmedLast = lastLine.trim();
  const trimmedPrev = prevLine.trim();

  // Cursor on an empty/whitespace-only line after a block opener
  if (trimmedLast === "") {
    if (isBlockOpener(trimmedPrev, languageId)) return true;
    if (isDocstringStart(trimmedPrev, languageId)) return true;
  }

  // Cursor right after a block opener on the same line (e.g., just typed `{`)
  if (isBlockOpener(trimmedLast, languageId)) return true;

  // Inside an open docstring / JSDoc
  if (isInsideDocstring(lines, languageId)) return true;

  return false;
}

/** Check if a line ends with a block-opening pattern. */
function isBlockOpener(line: string, languageId: string): boolean {
  if (!line) return false;

  // Python: lines ending with `:`
  if (languageId === "python") {
    return /:\s*(#.*)?$/.test(line);
  }

  // C-family: lines ending with `{` or `=> {`
  return /\{\s*$/.test(line);
}

/** Check if a line opens a docstring/JSDoc that is NOT closed on the same line. */
function isDocstringStart(line: string, languageId: string): boolean {
  if (languageId === "python") {
    // Count triple quotes — one means opened but not closed on this line
    const matches = line.match(/'{3}|"{3}/g);
    return matches !== null && matches.length === 1;
  }

  // JSDoc: `/**` without a closing `*/` on the same line
  return /\/\*\*/.test(line) && !/\*\//.test(line);
}

/** Check if the cursor is currently inside an unclosed docstring. */
function isInsideDocstring(lines: string[], languageId: string): boolean {
  if (languageId === "python") {
    // Count triple-quote occurrences — odd count means we're inside one
    let count = 0;
    for (const line of lines) {
      const matches = line.match(/'{3}|"{3}/g);
      if (matches) count += matches.length;
    }
    return count % 2 === 1;
  }

  // JSDoc: look for `/**` without a closing `*/`
  let inJsdoc = false;
  for (const line of lines) {
    if (/\/\*\*/.test(line)) inJsdoc = true;
    if (/\*\//.test(line)) inJsdoc = false;
  }
  return inJsdoc;
}
