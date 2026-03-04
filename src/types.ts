export type StatusBarState = "ready" | "loading" | "disabled" | "error";

export interface ProviderConfig {
  endpoint: string;
  model: string;
  maxTokens: number;
}
