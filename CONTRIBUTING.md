# Contributing to Leyline

Thanks for your interest in contributing! This document provides guidelines and
instructions for contributing.

## Branching Model

This project follows **GitHub Flow**:

- **`main` is always stable and deployable.** Every commit on `main` passes CI.
- **All changes go through short-lived feature branches + pull requests.** No
  direct pushes to `main` for external contributors.
- **Branches should be small and focused** — hours to a few days, not weeks.
  One feature or fix per branch.

### Branch Naming

Use a conventional prefix:

- `feat/` — new features (e.g., `feat/anthropic-provider`)
- `fix/` — bug fixes (e.g., `fix/duplicate-requests`)
- `docs/` — documentation (e.g., `docs/configuration-examples`)
- `chore/` — maintenance (e.g., `chore/update-dependencies`)

## Releases and Versioning

Releases are automated via GitHub Actions on tag push. Only maintainers create
tags.

This project follows the
[VS Code even/odd minor version convention](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions):

- **Even minor** (`0.2.0`, `0.4.0`) → stable release
- **Odd minor** (`0.3.0`, `0.5.0`) → pre-release

The release workflow detects the minor version automatically and passes
`--pre-release` to `vsce` when odd. Tags must be plain `vMAJOR.MINOR.PATCH`
with no suffix — the version in `package.json` must match the tag exactly.

### Stable release

```bash
# Bump package.json version to next even minor, then:
git tag v0.4.0 && git push origin v0.4.0
```

### Pre-release

```bash
# Bump package.json version to next odd minor, then:
git tag v0.5.0 && git push origin v0.5.0
```

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

3. Create a feature branch from `main`:

   ```bash
   git checkout -b feat/my-feature main
   ```

## Development Commands

```bash
bun run compile     # Build with esbuild
bun run watch       # Watch mode
bun run check-types # Type check with TypeScript
bun run test        # Run tests
bun run lint        # Check lint
bun run lint:fix    # Fix lint issues
bun run package     # Build VSIX package
```

## Testing Locally

Press **F5** in VS Code to launch the Extension Development Host with the
extension loaded. The status bar should show "Leyline" and you can test inline
completions with a configured API endpoint and key.

The `playground/` directory contains sample files for manual QA. See
[`playground/TESTING.md`](playground/TESTING.md) for the testing guide.

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
2. Ensure type check passes (`bun run check-types`).
3. Ensure lint passes (`bun run lint`).
4. Fill out the PR template.
5. Keep PRs focused — one feature or fix per branch/PR.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
