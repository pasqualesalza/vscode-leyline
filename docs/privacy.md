# Privacy

## What Leyline sends

When you request a completion, Leyline sends a single HTTP request to the
endpoint you configured (`leyline.codestral.endpoint` or
`leyline.ollama.endpoint`). The request body contains:

- The text immediately **before your cursor** (up to `leyline.prefixLines` lines)
- The text immediately **after your cursor** (up to `leyline.suffixLines` lines)
- _(If `leyline.crossFileContext` is enabled)_ Short type and function signature
  snippets extracted from other open files in the same language — no full file
  contents, only declaration lines

That is the entirety of what leaves your machine.

## What Leyline does not send

- No keystrokes or typing events outside of completion requests
- No file paths, project names, or workspace metadata
- No telemetry, analytics, or usage data
- No error reports to any external service
- No data to Anthropic, Mistral, or any party other than your configured endpoint

## API keys

API keys are stored in your operating system's keychain via VS Code
[SecretStorage](https://code.visualstudio.com/api/references/vscode-api#SecretStorage).
They are never:

- Written to disk in plain text
- Included in extension logs
- Sent to any service other than the endpoint you configured

## Your endpoint

Leyline is a client — it connects only to the endpoint URL you provide. If you
use Codestral's default cloud endpoint (`https://codestral.mistral.ai`), your
code snippets are sent to Mistral's servers and subject to
[Mistral's privacy policy](https://mistral.ai/privacy-policy). If you use a
self-hosted Ollama instance, your code never leaves your machine.

## Logs

The **Output → Leyline** panel logs operational events (requests sent,
responses received, errors). It never logs:

- The actual code content of requests or responses
- API keys or credentials
