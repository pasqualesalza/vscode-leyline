## Configure your provider

**Codestral users:** set your API key. It is stored in your OS keychain — never in files or logs.

[$(key) Set API Key](command:leyline.setApiKey)

---

**Ollama users:** make sure Ollama is running with a FIM-capable model.

Open a terminal and run:

```bash
ollama serve
ollama pull qwen2.5-coder:7b
```

The default model is `qwen2.5-coder:7b`. To use a different model, set `leyline.ollama.model` in [Settings](command:workbench.action.openSettings?%5B%22leyline.ollama.model%22%5D).
