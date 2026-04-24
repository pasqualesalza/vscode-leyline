# Troubleshooting

## Quick checklist

1. Is the status bar showing a warning or error icon? Hover over it for details.
2. Open **Output → Leyline** (`Cmd+Shift+U` / `Ctrl+Shift+U`, then select
   "Leyline") — errors and request logs appear here.
3. Run **Leyline: Test Connection** from the Command Palette to verify your
   endpoint and API key are working.

---

## Status bar warning icon (yellow ⚠)

**Cause**: No API key is configured for the Codestral provider.

**Fix**: Click the status bar to open the Leyline menu → **Set API Key** →
paste your [Codestral API key](https://console.mistral.ai/). The warning
disappears once the key is saved.

> Ollama users: no API key is needed. If you see a warning, make sure
> `leyline.provider` is set to `ollama` in Settings.

---

## No completions appear

**Check 1 — Provider selected?**  
Open the Command Palette → **Leyline: Show Menu** → confirm the correct
provider is shown.

**Check 2 — Logs show an error?**  
Open Output → Leyline. Look for lines starting with `[error]` or `[warn]`.
Common messages:

| Message | Cause | Fix |
| --- | --- | --- |
| `API error (401)` | Invalid or missing API key | Run **Leyline: Set API Key** |
| `API error (404)` | Wrong endpoint URL or model name | Check `leyline.codestral.endpoint` / `leyline.ollama.model` |
| `fetch failed` / `ECONNREFUSED` | Endpoint unreachable | Check endpoint URL; for Ollama, verify `ollama serve` is running |
| `AbortError` / timeout | Request exceeded timeout | Increase `leyline.requestTimeout` or use a faster model |

**Check 3 — Language disabled?**  
Check `leyline.enable` in Settings. The default is `{ "*": true }`. If you
added a `false` entry for the language you're editing, completions are
suppressed.

**Check 4 — File excluded?**  
Check `leyline.disableInFiles`. If the current file matches a glob pattern,
completions are disabled.

---

## Completions appear but Tab doesn't accept them

**Cause**: IntelliSense is open and has focus over the inline suggestion.

**Fix**: Press `Escape` to close IntelliSense first, then `Tab`. Or use
`Alt+\` to force-trigger and then `Tab`.

If this happens constantly, set `leyline.tabOverride: false` and use `Alt+\`
to accept completions instead of `Tab`.

---

## Ollama completions are empty or very slow

**Check 1 — Model supports FIM?**  
Not all Ollama models support fill-in-the-middle. Try `qwen2.5-coder:7b`:

```bash
ollama pull qwen2.5-coder:7b
```

Then set `leyline.ollama.model` to `qwen2.5-coder:7b`.

**Check 2 — Model loaded?**  
Run `ollama ps` to see if the model is currently loaded. The first request
after a cold start can take several seconds.

**Check 3 — Request timeout too short?**  
Increase `leyline.requestTimeout` (default 30 seconds). Large local models can
be slow on first inference.

---

## Tree-sitter keeps rejecting completions

**Symptom**: Completions briefly appear then disappear; logs show
`Tree-sitter: completion rejected`.

**Fix**: Disable `leyline.treeSitter`. The validator may be too strict for
your codebase or the language grammar may have edge cases. Re-enable it
selectively if you specifically need syntax validation.

---

## Completions conflict with GitHub Copilot

Both extensions compete for the inline suggestion slot. Only one completion
will appear at a time. To use Leyline as your sole completion source:

1. Open Extensions panel (`Cmd+Shift+X`)
2. Search "GitHub Copilot"
3. Click **Disable** on both **GitHub Copilot** and **GitHub Copilot Chat**

---

## Getting more help

If none of the above helps, open an issue at
[github.com/pasqualesalza/vscode-leyline/issues](https://github.com/pasqualesalza/vscode-leyline/issues)
and include:
- The error message from Output → Leyline
- Your provider and model settings
- VS Code version and OS
