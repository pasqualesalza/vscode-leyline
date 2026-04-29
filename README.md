# Leyline: Code Anticipation

[![CI](https://github.com/pasqualesalza/vscode-leyline/actions/workflows/ci.yml/badge.svg)](https://github.com/pasqualesalza/vscode-leyline/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Inline AI code completion for VS Code. Bring your own endpoint and API key, or
run models locally — works with
[Codestral](https://mistral.ai/technology/codestral) (Mistral FIM) and
[Ollama](https://ollama.com).

## Why Leyline

Most AI completion tools send your code to a fixed cloud service and charge a
subscription. Leyline is different:

- **Bring your own endpoint** — point it at Codestral, an Azure AI deployment,
  or any FIM-compatible endpoint you control.
- **Run fully local** — use Ollama with `qwen2.5-coder`, `codellama`, or any
  FIM-capable model. No API key, no cloud calls.
- **No telemetry** — only your configured endpoint ever receives code snippets.
  Nothing goes to Anthropic, Mistral, or any third party.
- **Cross-file context** — completions include type definitions and function
  signatures from related open files, not just the current buffer.

## Installation

Search for **Leyline** in the VS Code Extensions panel (`Ctrl+Shift+X`) and
click Install.

## Quick Start

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **Leyline: Select Provider** — choose **Codestral** (cloud) or **Ollama** (local)
3. **Codestral:** Run **Leyline: Set API Key** and paste your [Codestral API key](https://console.mistral.ai/)  
   **Ollama:** Make sure Ollama is running (`ollama serve`) with a FIM model:
   ```bash
   ollama pull qwen2.5-coder:7b
   ```
4. Open any source file and start typing — ghost text appears after a brief pause

Press `Tab` to accept · `Escape` to dismiss · `Alt+\` to force-trigger

## Features

- **Inline ghost text** — completions appear as you type, accept with `Tab`.
- **Cross-file context** — includes types, functions, and signatures from open
  files so the model understands your project, not just the current file.
- **Smart multiline** — auto-detects function bodies, docstrings, and JSDoc to
  generate multi-line completions where it matters.
- **Tab override** — `Tab` accepts completions without conflicting with
  IntelliSense. When IntelliSense is open, `Tab` goes to IntelliSense as usual.
- **Force trigger** — press `Alt+\` to request a completion on demand.
- **Streaming** — responses stream in real time; cancellation works mid-generation.
- **Bracket-aware** — post-processing truncates completions that would duplicate
  closing braces already in your code.
- **Tree-sitter validation** — opt-in syntax check that silently discards
  completions introducing parse errors (grammars downloaded on first use).
- **Completion cache** — recent completions are served instantly on undo/retype.
- **Per-language control** — enable or disable completions per language or file
  glob pattern.
- **Secure credentials** — API keys stored in your OS keychain via VS Code
  SecretStorage; never logged or sent anywhere except the configured endpoint.
- **Reactive status bar** — shows provider state, disables per language/glob,
  and displays error details on hover.
- **Multi-provider** — Codestral (cloud) and Ollama (local) out of the box.

## Commands

| Command | Shortcut | Description |
| --- | --- | --- |
| `Leyline: Set API Key` | | Store your API key in the OS keychain |
| `Leyline: Toggle Inline Completion` | | Enable or disable completions |
| `Leyline: Select Provider` | | Switch between Codestral and Ollama |
| `Leyline: Trigger Inline Completion` | `Alt+\` | Request a completion on demand |
| `Leyline: Show Menu` | | Quick access to all actions |
| `Leyline: Test Connection` | | Verify the endpoint is reachable |

## Configuration

Settings are organized in categories under the `leyline.*` namespace. Open
Settings (`Cmd+,`) and search for "leyline" to see all options grouped by:
**General**, **Filters**, **Completion**, **Quality**, **Codestral**, **Ollama**.

### Key settings

| Setting | Default | Description |
| --- | --- | --- |
| `leyline.provider` | `"codestral"` | AI backend (`codestral` or `ollama`) |
| `leyline.tabOverride` | `true` | Let Tab accept completions when IntelliSense is closed |
| `leyline.enable` | `{ "*": true }` | Per-language toggle (e.g., `{ "*": true, "markdown": false, "json": false, "plaintext": false }`) |
| `leyline.disableInFiles` | `[]` | Glob patterns to exclude (e.g., `"**/*.md"`) |
| `leyline.multiline` | `"auto"` | `auto` / `always` / `never` |
| `leyline.treeSitter` | `false` | Syntax validation via Tree-sitter |
| `leyline.crossFileContext` | `true` | Include context from related open files |
| `leyline.crossFileContextTokens` | `500` | Max tokens of cross-file context (0–2000) |
| `leyline.cacheSize` | `50` | Cached completions (0 to disable) |
| `leyline.debounceMs` | `300` | Typing debounce in ms |
| `leyline.requestTimeout` | `30` | Request timeout in seconds |
| `leyline.prefixLines` | `100` | Lines of context before cursor |
| `leyline.suffixLines` | `30` | Lines of context after cursor |

Each provider also has `endpoint`, `model`, and `maxTokens` settings — see the
Settings UI for details.

## Tested Providers and Models

| Provider | Model | Notes |
| --- | --- | --- |
| Codestral | `codestral-latest` | Default. Cloud, requires API key from [console.mistral.ai](https://console.mistral.ai/) |
| Ollama | `qwen2.5-coder:7b` | Default local model. Best all-round for FIM |
| Ollama | `codellama:7b` | Good alternative local model |
| Ollama | `deepseek-coder:6.7b` | Also tested, solid results |
| Azure AI | Codestral-2501 | Set `leyline.codestral.endpoint` to your Azure endpoint |

Any provider that implements the Mistral FIM API (`POST /v1/fim/completions`) or
the Ollama API (`POST /api/generate` with suffix support) should work.

## Supported Languages

Cross-file context includes import-aware type and signature extraction for:

**TypeScript** · **JavaScript** · **TSX / JSX** · **Python** · **Go** · **Java** · **Rust** · **C / C++**

Basic inline completion (ghost text, FIM) works in **any language**. Cross-file
context is language-specific but everything else is language-agnostic.

## Privacy

When you request a completion, Leyline sends the text immediately before and
after your cursor — and, if cross-file context is enabled, short type and
signature snippets from related open files — to the endpoint you configured.
That is the only outbound network call Leyline makes.

- No telemetry, no analytics, no usage tracking.
- API keys are stored in your OS keychain via VS Code SecretStorage — never
  written to disk, never logged.
- Leyline has no connection to Anthropic, Mistral, or any service other than
  your configured endpoint.

## Troubleshooting

**Status bar shows a warning icon**  
No API key is configured for the current provider. Click the status bar to open
the Leyline menu, then choose **Set API Key**.

**Completions are not appearing**  
Open **Output → Leyline** for error details. Common causes: incorrect API key,
wrong endpoint URL, or a model that does not support FIM.

**Ollama completions are empty or very slow**  
Make sure the model supports fill-in-the-middle (FIM). Not all Ollama models do.
`qwen2.5-coder:7b` is the most reliable choice.

**Tree-sitter keeps rejecting completions**  
If you enabled `leyline.treeSitter` and completions rarely appear, the validator
may be too strict for your codebase or language. Disable it to restore normal
behaviour.

**Tab conflicts with another extension or snippet**  
Set `leyline.tabOverride: false` to remove the Tab keybinding. Use `Alt+\` to
accept completions instead.

**Using Leyline alongside GitHub Copilot**  
Both extensions compete for ghost text. If you want Leyline to be the sole
completion source, disable Copilot: Extensions panel → search "GitHub Copilot"
→ Disable.

## How It Works

1. A debounce timer starts when you type (default 300 ms)
2. Prefix/suffix text around the cursor is extracted
3. _(If enabled)_ Signatures from related open files are prepended as context
4. A FIM prompt is sent to your configured provider; the response streams back
5. Post-processing: repetition stripping, suffix overlap removal, bracket
   overflow truncation, _(opt-in)_ Tree-sitter syntax validation
6. The cleaned text appears as inline ghost text

Requests cancel automatically when you keep typing; recent completions are
cached for instant replay on undo/retype.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards,
and the release workflow.

## License

[MIT](LICENSE)
