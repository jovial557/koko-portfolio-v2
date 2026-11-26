export type ConversationMessage = { role: "user" | "assistant"; content: string };

export const chatLimits = {
  messages: 11,
  userCharacters: 350,
  assistantCharacters: 1600,
  contextCharacters: 6000,
  bodyBytes: 24_000,
} as const;

export const chatErrors = {
  unavailable: "Carrot is having trouble replying right now. Please try again.",
  rateLimit: "Carrot needs a short break. Please try again in a minute.",
  timeout: "Carrot took too long to reply. Please try again.",
  invalid: "Carrot couldn’t read that message. Try a shorter question.",
} as const;
