import { APICallError, DefaultChatTransport, type UIMessage } from "ai";
import { chatErrors, chatLimits, type ConversationMessage } from "@/lib/carrot/chat-contract";
import { isToolName, readToolResult, type ToolEntry, type ToolName } from "@/lib/carrot/tool-contract";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ body }) => ({ body: { messages: body?.messages } }),
});

class ReplyError extends Error {}

export function replyErrorMessage(error: unknown): string {
  if (error instanceof ReplyError) return error.message;
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429 || error.statusCode === 402) return chatErrors.rateLimit;
    if (error.statusCode === 408 || error.statusCode === 504) return chatErrors.timeout;
    if (error.statusCode === 400 || error.statusCode === 413 || error.statusCode === 415) return chatErrors.invalid;
  }
  return chatErrors.unavailable;
}

export async function streamReply(
  messages: ConversationMessage[],
  signal: AbortSignal,
  onUpdate: (text: string, tools: ToolEntry[]) => void,
) {
  const stream = await transport.sendMessages({
    trigger: "submit-message",
    chatId: "carrot",
    messageId: undefined,
    messages: [] as UIMessage[],
    body: { messages },
    abortSignal: signal,
  });

  const reader = stream.getReader();
  let text = "";
  const calls = new Map<string, ToolName>();
  const tools = new Map<string, ToolEntry>();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) throw new ReplyError(chatErrors.unavailable);
      if (value.type === "text-delta") {
        text = (text + value.delta).slice(0, chatLimits.assistantCharacters);
        if (text.trim()) onUpdate(text, [...tools.values()]);
      } else if (value.type === "tool-input-available" && isToolName(value.toolName)) {
        calls.set(value.toolCallId, value.toolName);
      } else if (value.type === "tool-output-available") {
        const result = readToolResult(value.output);
        if (result && calls.get(value.toolCallId) === result.name) {
          tools.set(value.toolCallId, { id: value.toolCallId, result });
          onUpdate(text, [...tools.values()]);
        }
      } else if (value.type === "tool-input-error" || value.type === "tool-output-error") {
        const name = value.type === "tool-input-error" ? value.toolName : calls.get(value.toolCallId);
        if (isToolName(name)) {
          tools.set(value.toolCallId, { id: value.toolCallId, rejected: name });
          onUpdate(text, [...tools.values()]);
        }
      } else if (value.type === "error") {
        const message = value.errorText;
        throw new ReplyError(message === chatErrors.rateLimit || message === chatErrors.timeout ? message : chatErrors.unavailable);
      } else if (value.type === "abort") {
        throw new ReplyError(chatErrors.timeout);
      } else if (value.type === "finish") {
        if ((!text.trim() && tools.size === 0) || value.finishReason === "error" || value.finishReason === "content-filter") {
          throw new ReplyError(chatErrors.unavailable);
        }
        return { text, tools: [...tools.values()] };
      }
    }
  } catch (error) {
    if (!signal.aborted && tools.size > 0) {
      // A failed follow-up generation does not invalidate a completed tool result.
      return { text, tools: [...tools.values()], error: replyErrorMessage(error) };
    }
    throw error;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
