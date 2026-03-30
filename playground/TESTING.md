# Playground Testing Guide

Press F5 to launch the Extension Development Host with the playground files.
After each test, undo (Cmd+Z) to restore the file.

Trigger: press Enter (or type a character) and wait for the debounce (~300ms).
No need to type a space — just Enter is enough in most cases.

## 01-function-body.py

Cursor at end of line 1 (`def fibonacci(n: int) -> int:`), press Enter.
**Expected**: suggests fibonacci body (e.g., `if n <= 1: return n`).

## 02-midline.ts

Cursor after `users.` on line 9 (before the `;`), type `f`.
Note: IntelliSense may appear first — press Escape to dismiss it, then wait.
**Expected**: suggests `filter(u => u.active)` or similar. Does NOT duplicate the `;`.

## 03-docstring.py

Cursor at end of line 2 (after `"""`), press Enter.
**Expected**: generates a docstring describing `price` and `percentage` parameters.

## 04-class.java

Cursor at end of line 15 (after `toString() {`), press Enter.
**Expected**: suggests toString body. Tab accepts. Does NOT duplicate closing `}`.

## 05-multiline.ts

Cursor at end of line 11 (after `const config =`), type ` {`.
**Expected**: suggests a full object literal `{ host: "localhost", port: 3000, debug: false }`.

## 06-overlap.ts

Cursor at end of line 8 (after `console.log` line), press Enter, type `const`.
**Expected**: suggests code WITHOUT duplicating the `}` on line 10.

## 07-empty-file.go

Cursor at end of line 9 (after `func main() {`), press Enter, type `f`.
Note: IntelliSense may appear — press Escape to dismiss it, then wait.
**Expected**: suggests something using `fmt` (e.g., `fmt.Println(greet("World"))`).

## 08-indentation.py

Cursor at end of line 4 (after `for item in items:`), press Enter.
**Expected**: suggests loop body with CORRECT indentation (no double-indent).

---

## Feature tests

These verify extension features, not completion quality. Run after the playground tests.

### Tab override

In `02-midline.ts`, type `f` after `users.`. If IntelliSense opens:
- Tab accepts IntelliSense (not the ghost text).
- Press Escape, wait for ghost text, then Tab accepts the inline completion.

### Force trigger (Alt+\)

In any file, place cursor and press Alt+\. Completion triggers on demand.

### Per-language disable

Add to VS Code settings: `"leyline.enable": { "*": true, "markdown": false }`.
Open a `.md` file and type — no completions should appear.
Remove the setting after testing.

### File exclusion

Add to settings: `"leyline.disableInFiles": ["**/TESTING.md"]`.
Open this file and type — no completions should appear.
Remove the setting after testing.

### Multiline control

Set `"leyline.multiline": "always"`. In `01-function-body.py`, trigger a completion.
Should suggest multiple lines (not stop at first blank line).
Reset to `"auto"` after testing.

### Error tooltip

Set an invalid endpoint. Trigger a completion. Hover over the red status bar icon.
The tooltip should show the actual error message, not just "Error occurred".
The status bar should auto-reset to normal after ~5 seconds.

### Tree-sitter validation (optional)

Add to settings: `"leyline.treeSitter": true`.
First completion in each language downloads the grammar (~200KB) — check Output panel.

In `01-function-body.py`, trigger a completion.
**Expected**: completion appears normally (valid Python passes Tree-sitter).

Open a `.toml` or `.yaml` file and trigger.
**Expected**: completion appears normally (graceful fallback, no grammar needed).

Check Output → "Leyline" for `Tree-sitter: rejected` or grammar download messages.
Remove the setting after testing.
