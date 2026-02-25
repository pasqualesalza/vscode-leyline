import type { ChatMessage } from "./types.js";

export function extractContext(
  text: string,
  offset: number,
  prefixLineCount: number,
  suffixLineCount: number,
): { prefix: string; suffix: string } {
  const before = text.slice(0, offset);
  const after = text.slice(offset);

  const prefixLines = before.split("\n");
  const truncatedPrefix =
    prefixLines.length > prefixLineCount
      ? prefixLines.slice(-prefixLineCount).join("\n")
      : before;

  const suffixLines = after.split("\n");
  const truncatedSuffix =
    suffixLines.length > suffixLineCount
      ? suffixLines.slice(0, suffixLineCount).join("\n")
      : after;

  return { prefix: truncatedPrefix, suffix: truncatedSuffix };
}

export function buildFIMMessages(
  prefix: string,
  suffix: string,
  languageId: string,
  _filePath: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a code completion engine. Output ONLY the code to insert at the cursor. No markdown, no explanations. Language: ${languageId}`,
    },
    {
      role: "user",
      content: `<prefix>\n${prefix}\n</prefix>\n<suffix>\n${suffix}\n</suffix>\nComplete the code between prefix and suffix.`,
    },
  ];
}
