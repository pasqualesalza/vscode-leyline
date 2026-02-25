# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-02-25

### Added

- Inline code completion via `InlineCompletionItemProvider` with ghost text.
- Azure OpenAI provider with deployment-based URL and `api-key` header.
- OpenAI provider with Bearer token authentication.
- FIM (Fill-in-the-Middle) prompt construction via chat completions.
- Secure API key storage using VS Code SecretStorage (OS keychain).
- Configurable context window (prefix/suffix line counts).
- Request cancellation via AbortController linked to CancellationToken.
- Configurable debounce delay before sending requests.
- Status bar indicator with ready, loading, disabled, and error states.
- Toggle command to enable/disable inline completion.
- Set API Key command with password input.
- Select Provider command with QuickPick.
- Configuration change listener for live settings updates.
- CI workflow with build, lint, and test steps.
- Release workflow with VSIX packaging and GitHub Release.
- Dependabot configuration for npm and GitHub Actions dependencies.
