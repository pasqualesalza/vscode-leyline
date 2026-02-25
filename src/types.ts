export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type StatusBarState = "ready" | "loading" | "disabled" | "error";
