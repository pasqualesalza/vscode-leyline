/**
 * Provider-agnostic FIM quality integration tests.
 *
 * Skipped unless LEYLINE_TEST_FIM=1 is set.
 *
 * Configuration (env vars):
 *   LEYLINE_TEST_FIM_PROVIDER  — "codestral" | "ollama" (default: "codestral")
 *   LEYLINE_TEST_FIM_ENDPOINT  — provider endpoint
 *   LEYLINE_TEST_FIM_MODEL     — model name
 *   LEYLINE_TEST_FIM_KEY       — API key
 *
 * Extracted from HumanEval-Infilling (https://github.com/openai/human-eval-infilling)
 * Copyright (c) OpenAI. Licensed under the MIT License.
 * See THIRD_PARTY_NOTICES.md for full license text.
 *
 * ## Assertion strategy
 *
 * These are integration smoke-tests against live models, not deterministic
 * oracle tests.  We do NOT assert on the *content* of the completion (that
 * would be model-dependent and flaky).  Instead we verify three invariants
 * that must hold for any well-behaved postProcess implementation:
 *
 *  1. **Idempotency** — applying postProcess twice yields the same result.
 *  2. **No residual char-level overlap** — stripOverlap is a fixed-point.
 *  3. **No residual line-level overlap** — stripDuplicateLines is a fixed-point.
 *
 * Deterministic correctness of postProcess (exact input → exact output) is
 * covered by the unit tests in prompt.test.ts using the fixtures in
 * test/fixtures/fim-cases.ts.
 */
import { describe, expect, it } from "vitest";
import {
  postProcess,
  stripDuplicateLines,
  stripOverlap,
} from "../src/prompt.js";
import {
  charOverlapCases,
  lineOverlapCases,
  noOverlapCases,
} from "./fixtures/fim-cases.js";
import humanevalCases from "./fixtures/humaneval-infilling.json";
import { makeProvider, providerName } from "./helpers/provider-factory.js";

const allFimCases = [
  ...charOverlapCases,
  ...lineOverlapCases,
  ...noOverlapCases,
];

describe.skipIf(!process.env.LEYLINE_TEST_FIM)(
  `FIM quality (${providerName})`,
  { timeout: 120_000 },
  () => {
    for (const tc of allFimCases) {
      describe(tc.name, () => {
        it("postProcess is idempotent and leaves no residual overlap", async () => {
          const provider = makeProvider();
          const raw = await provider.complete(
            tc.prefix,
            tc.suffix,
            tc.language,
            new AbortController().signal,
          );

          expect(raw).toBeTypeOf("string");
          const trimmed = postProcess(raw as string, tc.prefix, tc.suffix);

          console.log(
            `[${tc.name}] raw: ${JSON.stringify(raw)}, trimmed: ${JSON.stringify(trimmed)}`,
          );

          // Idempotency
          expect(postProcess(trimmed, tc.prefix, tc.suffix)).toBe(trimmed);
          // No residual char-level overlap
          expect(stripOverlap(trimmed, tc.suffix)).toBe(trimmed);
          // No residual line-level overlap
          expect(stripDuplicateLines(trimmed, tc.suffix)).toBe(trimmed);
        });
      });
    }

    describe("HumanEval-Infilling benchmark", () => {
      for (const tc of humanevalCases) {
        it(`${tc.task_id} (${tc.entry_point})`, async () => {
          const provider = makeProvider();
          const raw = await provider.complete(
            tc.prefix,
            tc.suffix,
            "python",
            new AbortController().signal,
          );

          expect(raw).toBeTypeOf("string");
          const trimmed = postProcess(raw as string, tc.prefix, tc.suffix);

          console.log(
            `[${tc.task_id}] raw: ${JSON.stringify(raw)}, trimmed: ${JSON.stringify(trimmed)}`,
          );

          // Idempotency
          expect(postProcess(trimmed, tc.prefix, tc.suffix)).toBe(trimmed);
          // No residual char-level overlap
          expect(stripOverlap(trimmed, tc.suffix)).toBe(trimmed);
          // No residual line-level overlap
          expect(stripDuplicateLines(trimmed, tc.suffix)).toBe(trimmed);
        });
      }
    });
  },
);
