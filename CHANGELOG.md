# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-03-04

### Added

- Inline code completion via `InlineCompletionItemProvider` with ghost text.
- Codestral provider (Mistral FIM API) with configurable endpoint and model.
- Ollama provider for local model inference.
- FIM (Fill-in-the-Middle) prompt construction via chat completions.
- FIM post-processing: `stripRepetition` and `stripPrefixDuplicate` for cleaner
  completions.
- Secure API key storage using VS Code SecretStorage (OS keychain).
- Configurable context window (prefix/suffix line counts).
- Per-provider configuration (endpoint, model, maxTokens).
- Request cancellation via AbortController linked to CancellationToken.
- Configurable debounce delay before sending requests.
- Status bar indicator with ready, loading, disabled, and error states.
- Toggle command to enable/disable inline completion (status bar click).
- Set API Key command with password input.
- Select Provider command with QuickPick.
- Show Menu command for quick access to all actions.
- Configuration change listener for live settings updates.
- E2E integration tests with `@vscode/test-cli`.
- FIM quality test suite and latency benchmarks.
- CI workflow with build, lint, test, and e2e steps.
- Release workflow with VSIX packaging and GitHub Release.
- Dependabot configuration for npm and GitHub Actions dependencies.
- THIRD_PARTY_NOTICES.md for HumanEval-Infilling attribution.
