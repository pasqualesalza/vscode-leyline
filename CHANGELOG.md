# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-04-02

### Changed

- Upgrade to TypeScript 6.0.2.
- Update dependencies: web-tree-sitter 0.26.8, Biome 2.4.10, esbuild 0.27.5,
  Vitest 4.1.2, @types/vscode 1.110.0, @types/node 22.19.15.
- Add pre-push hook (Lefthook) running type-check, compile, and tests locally
  before pushing.
- Add CI badge to README (repo is now public).

## [0.1.0] - 2026-03-30

### Added

- **Inline ghost text** — completions appear as you type via
  `InlineCompletionItemProvider`.
- **Codestral provider** — Mistral FIM API with configurable endpoint and model.
- **Ollama provider** — local model inference with any FIM-capable model
  (e.g., `qwen2.5-coder`, `codellama`, `deepseek-coder`).
- **Streaming** — both providers stream responses (SSE / JSONL) for faster
  cancellation mid-generation.
- **Tab override** — `Tab` accepts inline completions when IntelliSense is not
  visible; IntelliSense keeps priority when open (`leyline.tabOverride`).
- **Force-trigger** — `Alt+\` triggers a completion on demand.
- **Per-language enable/disable** — `leyline.enable` setting with language ID
  keys (e.g., `{ "*": true, "markdown": false }`).
- **File exclusion by glob** — `leyline.disableInFiles` setting
  (e.g., `["**/*.md", "**/.env"]`).
- **Multiline completion control** — `leyline.multiline` with `auto`, `always`,
  and `never` modes. Auto mode detects block bodies, docstrings, and JSDoc.
- **LRU completion cache** — reuses recent completions instantly on undo/retype
  (`leyline.cacheSize`, default 50).
- **Bracket-aware post-processing** — truncates completions that close more
  brackets than they open, preventing duplicated braces from the suffix.
- **Tree-sitter syntax validation** — opt-in (`leyline.treeSitter`) parsing that
  silently discards completions introducing syntax errors. Grammars downloaded
  on first use (~200 KB each) and cached locally.
- **Secure credentials** — API keys stored in OS keychain via VS Code
  SecretStorage; never logged or exposed.
- **Configurable context** — prefix/suffix line counts, debounce, request
  timeout, max tokens per provider.
- **Reactive status bar** — shows ready, loading, disabled (per-language/glob),
  or error with tooltip details.
- **LogOutputChannel** (`Output → Leyline`) — operational logging at info/debug
  levels; never logs user code or API keys.
- **Settings UI** — organized in categories (General, Filters, Completion,
  Quality, Codestral, Ollama) with rich markdown descriptions.
- **Untrusted workspace safety** — endpoint, model, and Tree-sitter settings
  are restricted in untrusted workspaces.
- **Commands** — Set API Key, Toggle, Select Provider, Show Menu, Trigger.
- **Playground** — 8 test files with a `TESTING.md` guide for manual QA.
- **Test suite** — 205 unit tests, 55 FIM quality tests, CDN download tests,
  Ollama integration tests.
- **CI/CD** — GitHub Actions for build/lint/test and tag-based VSIX releases.
