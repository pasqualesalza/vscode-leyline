export interface CompletionProvider {
  name: string;
  complete(
    prefix: string,
    suffix: string,
    language: string,
    signal: AbortSignal,
  ): Promise<string | null>;
}
