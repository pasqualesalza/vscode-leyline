# Leyline

[![CI](https://github.com/pasqualesalza/vscode-leyline/actions/workflows/ci.yml/badge.svg)](https://github.com/pasqualesalza/vscode-leyline/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Lightweight VS Code extension for inline code completion using configurable AI
endpoints. Bring your own API key — works with Azure OpenAI and OpenAI.

> Named after MTG's _Leyline of Anticipation_ — the wordplay "ley**line** =
> in**line**" plus the anticipation/foresight metaphor.

## Features

- **Inline ghost text** — completions appear as you type, accept with `Tab`
- **Multi-provider** — Azure OpenAI and OpenAI out of the box
- **Secure credentials** — API keys stored in OS keychain via VS Code
  SecretStorage
- **Zero dependencies** — uses native `fetch`, no external packages at runtime
- **Configurable** — context window, debounce, temperature, max tokens
- **Status bar** — shows ready, loading, disabled, or error state

## Installation

### From VSIX

Download the `.vsix` from the
[latest release](https://github.com/pasqualesalza/vscode-leyline/releases) and
install:

```bash
code --install-extension leyline-0.1.0.vsix
```

### From Source

```bash
git clone https://github.com/pasqualesalza/vscode-leyline.git
cd vscode-leyline
bun install
bun run compile
```

Then press **F5** in VS Code to launch the Extension Development Host.

## Getting Started

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **Leyline: Set API Key** and paste your API key
3. Configure the endpoint in settings (`leyline.endpoint`)
4. Start typing in any file — ghost text completions will appear

## Commands

| Command                              | Description                     |
| ------------------------------------ | ------------------------------- |
| `Leyline: Set API Key`              | Securely store your API key     |
| `Leyline: Toggle Inline Completion` | Enable or disable completions   |
| `Leyline: Select Provider`          | Switch between providers        |

## Configuration

All settings are under the `leyline.*` namespace.

| Setting                | Type      | Default              | Description                                        |
| ---------------------- | --------- | -------------------- | -------------------------------------------------- |
| `leyline.provider`     | `string`  | `"azure-openai"`     | Completion provider (`azure-openai` or `openai`)   |
| `leyline.endpoint`     | `string`  | `""`                 | API endpoint URL                                   |
| `leyline.deployment`   | `string`  | `"gpt-5.1-codex-mini"` | Azure OpenAI deployment name                    |
| `leyline.apiVersion`   | `string`  | `"2024-06-01"`       | Azure OpenAI API version                           |
| `leyline.model`        | `string`  | `"gpt-4o"`           | Model name (OpenAI provider)                       |
| `leyline.enabled`      | `boolean` | `true`               | Enable inline code completion                      |
| `leyline.maxTokens`    | `number`  | `256`                | Maximum tokens in completion response              |
| `leyline.temperature`  | `number`  | `0`                  | Sampling temperature (0 = deterministic)           |
| `leyline.debounceMs`   | `number`  | `300`                | Debounce delay in milliseconds                     |
| `leyline.prefixLines`  | `number`  | `100`                | Lines before cursor to include as context          |
| `leyline.suffixLines`  | `number`  | `30`                 | Lines after cursor to include as context           |

## How It Works

Leyline uses the VS Code `InlineCompletionItemProvider` API to show ghost text
suggestions. When you type:

1. A configurable debounce timer starts (default 300ms)
2. The text before and after the cursor is extracted (prefix/suffix)
3. A FIM (Fill-in-the-Middle) prompt is built using chat completion messages
4. The prompt is sent to your configured API endpoint
5. The response appears as ghost text — press `Tab` to accept, `Escape` to
   dismiss

Requests are automatically cancelled when you keep typing, preventing stale
completions and unnecessary API calls.

## Development

```bash
bun install          # Install dependencies
bun run compile      # Build with esbuild
bun run watch        # Watch mode for development
bun run test         # Run tests
bun run lint         # Check lint with Biome
bun run lint:fix     # Auto-fix lint issues
bun run package      # Build VSIX package
```

## Releasing

Releases are automated via GitHub Actions on tag push:

```bash
# Stable release
git tag v0.2.0 && git push origin v0.2.0

# Pre-release (beta, rc, etc.)
git tag v0.3.0-beta.1 && git push origin v0.3.0-beta.1
```

Tags with a suffix (e.g., `-beta.1`, `-rc.1`) are packaged with the
`--pre-release` flag and marked as pre-release on GitHub.

> **Note:** The VS Code Marketplace does not support semver pre-release tags in
> the `version` field of `package.json` — it must always be plain
> `MAJOR.MINOR.PATCH`. The git tag suffix is used only as a workflow signal to
> pass `--pre-release` to `vsce package`. By convention, even minor versions
> (e.g., `0.2.x`) denote stable releases and odd minor versions (e.g., `0.3.x`)
> denote pre-releases.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
