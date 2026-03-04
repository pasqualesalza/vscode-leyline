/**
 * FIM latency benchmark — measures wall-clock time of provider.complete().
 *
 * Skipped unless LEYLINE_TEST_FIM=1 is set.
 *
 * Configuration (env vars):
 *   LEYLINE_TEST_FIM_PROVIDER  — "codestral" | "ollama" (default: "codestral")
 *   LEYLINE_TEST_FIM_ENDPOINT  — provider endpoint
 *   LEYLINE_TEST_FIM_MODEL     — model name
 *   LEYLINE_TEST_FIM_KEY       — API key
 *
 * Run:
 *   LEYLINE_TEST_FIM=1 bun run bench test/fim-latency.bench.ts
 */
import { bench, describe } from "vitest";
import { charOverlapCases } from "./fixtures/fim-cases.js";
import { makeProvider, providerName } from "./helpers/provider-factory.js";

if (!process.env.LEYLINE_TEST_FIM) {
  describe.skip("FIM latency (skipped — set LEYLINE_TEST_FIM=1)", () => {});
} else {
  // Pick one representative case per language
  const languageSeen = new Set<string>();
  const benchCases = charOverlapCases.filter((tc) => {
    if (languageSeen.has(tc.language)) return false;
    languageSeen.add(tc.language);
    return true;
  });

  describe(`FIM latency (${providerName})`, () => {
    for (const tc of benchCases) {
      bench(
        tc.name,
        async () => {
          const provider = makeProvider();
          await provider.complete(
            tc.prefix,
            tc.suffix,
            tc.language,
            new AbortController().signal,
          );
        },
        {
          iterations: 5,
          warmupIterations: 1,
          warmupTime: 0,
          time: 0,
        },
      );
    }
  });
}
