export interface CompletionProvider {
  readonly name: string;
  complete(
    prefix: string,
    suffix: string,
    language: string,
    signal: AbortSignal,
    stopOverride?: string[],
  ): Promise<string | null>;
}
