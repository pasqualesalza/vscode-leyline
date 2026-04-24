# Providers and Models

Leyline supports any provider that implements the Mistral FIM API or the Ollama
API. This page documents tested configurations.

---

## Codestral (Mistral cloud)

The default provider. Requires an API key from
[console.mistral.ai](https://console.mistral.ai/).

**Settings** (Settings UI → Codestral):

| Setting | Value |
| --- | --- |
| `leyline.provider` | `codestral` |
| `leyline.codestral.endpoint` | _(leave empty for default)_ |
| `leyline.codestral.model` | _(leave empty for `codestral-latest`)_ |
| `leyline.codestral.maxTokens` | `256` (default) |

**Set your API key:**

```
Cmd+Shift+P → Leyline: Set API Key → paste key
```

---

## Ollama (local)

Run any FIM-capable model locally. No API key required.
Install: [ollama.com](https://ollama.com)

```bash
ollama serve              # start the server (runs in background)
ollama pull qwen2.5-coder:7b  # download model on first use
```

**Settings** (Settings UI → Ollama):

| Setting | Value |
| --- | --- |
| `leyline.provider` | `ollama` |
| `leyline.ollama.endpoint` | _(leave empty for `http://localhost:11434`)_ |
| `leyline.ollama.model` | `qwen2.5-coder:7b` (default) |
| `leyline.ollama.maxTokens` | `256` (default) |

### Tested models

| Model | Pull command | Notes |
| --- | --- | --- |
| `qwen2.5-coder:7b` | `ollama pull qwen2.5-coder:7b` | Recommended. Best FIM quality, fast |
| `qwen2.5-coder:1.5b` | `ollama pull qwen2.5-coder:1.5b` | Fastest, good for low-RAM machines |
| `codellama:7b` | `ollama pull codellama:7b` | Good alternative |
| `deepseek-coder:6.7b` | `ollama pull deepseek-coder:6.7b` | Solid results |
| `starcoder2:3b` | `ollama pull starcoder2:3b` | Lightweight option |

> **FIM requirement**: not all Ollama models support fill-in-the-middle. If
> you see empty completions with a model not in this list, it likely does not
> support FIM.

---

## Azure AI (Codestral on Azure)

Use Codestral deployed on Azure AI Foundry with a custom endpoint.

**Settings**:

| Setting | Value |
| --- | --- |
| `leyline.provider` | `codestral` |
| `leyline.codestral.endpoint` | Your Azure AI endpoint URL |
| `leyline.codestral.model` | _(leave empty, or set to `Codestral-2501`)_ |

**Set your API key** (Azure API key, not Mistral):

```
Cmd+Shift+P → Leyline: Set API Key → paste Azure key
```

---

## Custom / self-hosted endpoints

Any service that implements `POST /v1/fim/completions` (Mistral FIM format) or
`POST /api/generate` with suffix support (Ollama format) should work.

Set `leyline.codestral.endpoint` or `leyline.ollama.endpoint` to your server's
base URL. Use **Leyline: Test Connection** to verify the endpoint is reachable.
