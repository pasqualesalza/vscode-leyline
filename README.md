# Leyline: Code Anticipation

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Lightweight VS Code extension for inline code completion powered by AI.
Bring your own API key or run models locally — works with
[Codestral](https://mistral.ai/technology/codestral) (Mistral FIM) and
[Ollama](https://ollama.com).

## Features

- **Inline ghost text** — completions appear as you type, accept with `Tab`.
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

## Installation

Download the `.vsix` from the
[latest release](https://github.com/pasqualesalza/vscode-leyline/releases) and
install:

```bash
code --install-extension leyline-0.1.0.vsix
```

## Getting Started

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **Leyline: Select Provider** — choose Codestral or Ollama
3. _(Codestral only)_ Run **Leyline: Set API Key** and paste your key
4. Start typing — ghost text completions appear after a short debounce
5. Press `Tab` to accept, `Escape` to dismiss, `Alt+\` to force-trigger

> **Ollama users:** make sure Ollama is running locally (`ollama serve`) with a
> FIM-capable model pulled (e.g., `ollama pull qwen2.5-coder:7b`).

## Commands

| Command                             | Shortcut | Description                          |
| ----------------------------------- | -------- | ------------------------------------ |
| `Leyline: Set API Key`             |          | Store your API key in the OS keychain |
| `Leyline: Toggle Inline Completion`|          | Enable or disable completions        |
| `Leyline: Select Provider`         |          | Switch between Codestral and Ollama  |
| `Leyline: Trigger Inline Completion`| `Alt+\` | Request a completion on demand       |
| `Leyline: Show Menu`              |          | Quick access to all actions          |

## Configuration

Settings are organized in categories under the `leyline.*` namespace. Open
Settings (`Cmd+,`) and search for "leyline" to see all options grouped by:
**General**, **Filters**, **Completion**, **Quality**, **Codestral**, **Ollama**.

### Key settings

| Setting | Default | Description |
| --- | --- | --- |
| `leyline.provider` | `"codestral"` | AI backend (`codestral` or `ollama`) |
| `leyline.tabOverride` | `true` | Let Tab accept completions when IntelliSense is closed |
| `leyline.enable` | `{ "*": true }` | Per-language toggle (e.g., `"markdown": false`) |
| `leyline.disableInFiles` | `[]` | Glob patterns to exclude (e.g., `"**/*.md"`) |
| `leyline.multiline` | `"auto"` | `auto` / `always` / `never` |
| `leyline.treeSitter` | `false` | Syntax validation via Tree-sitter |
| `leyline.cacheSize` | `50` | Cached completions (0 to disable) |
| `leyline.debounceMs` | `300` | Typing debounce in ms |
| `leyline.requestTimeout` | `30` | Request timeout in seconds |
| `leyline.prefixLines` | `100` | Lines of context before cursor |
| `leyline.suffixLines` | `30` | Lines of context after cursor |

Each provider also has `endpoint`, `model`, and `maxTokens` settings — see the
Settings UI for details.

## How It Works

1. A debounce timer starts when you type (default 300 ms)
2. The text before and after the cursor is extracted as prefix/suffix
3. A FIM (Fill-in-the-Middle) prompt is sent to your configured provider
4. The response streams back and is post-processed:
   - Repetition stripping (model looping)
   - Suffix overlap removal
   - Bracket overflow truncation
   - Prefix duplicate suppression
   - _(opt-in)_ Tree-sitter syntax validation
5. The cleaned completion appears as ghost text

Requests are automatically cancelled when you keep typing, and completions are
cached for instant replay on undo/retype.

## Development

```bash
bun install          # Install dependencies
bun run compile      # Build with esbuild
bun run watch        # Watch mode for development
bun run test         # Run tests
bun run lint         # Check with Biome
bun run package      # Build VSIX package
```

Press **F5** in VS Code to launch the Extension Development Host.

## Releasing

Releases are automated via GitHub Actions on tag push:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Tags with a suffix (e.g., `-beta.1`) are packaged with `--pre-release`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
