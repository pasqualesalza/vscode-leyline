# Contributing to Leyline

Thanks for your interest in contributing! This document provides guidelines and
instructions for contributing.

## Getting Started

1. Fork the repository and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/vscode-leyline.git
   cd vscode-leyline
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a feature branch:

   ```bash
   git checkout -b feat/my-feature
   ```

## Development Commands

```bash
bun run compile     # Build with esbuild
bun run watch       # Watch mode
bun run test        # Run tests
bun run lint        # Check lint
bun run lint:fix    # Fix lint issues
bun run package     # Build VSIX package
```

## Testing Locally

Press **F5** in VS Code to launch the Extension Development Host with the
extension loaded. The status bar should show "Leyline" and you can test inline
completions with a configured API endpoint and key.

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting.
A pre-commit hook via [Lefthook](https://github.com/evilmartians/lefthook)
runs `bun run lint` automatically before each commit.

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — a new feature
- `fix:` — a bug fix
- `docs:` — documentation changes
- `test:` — adding or updating tests
- `chore:` — maintenance tasks (dependencies, CI, tooling)

Examples:

```
feat: add Anthropic provider
fix: prevent duplicate requests on rapid typing
docs: add configuration examples to README
```

## Pull Requests

1. Ensure all tests pass (`bun run test`).
2. Ensure lint passes (`bun run lint`).
3. Fill out the PR template.
4. Keep PRs focused — one feature or fix per PR.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
