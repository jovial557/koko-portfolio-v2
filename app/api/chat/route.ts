import { consumeStream, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream } from "ai";
import { chatErrors, chatLimits, type ConversationMessage } from "@/lib/carrot/chat-contract";
import { carrotModel } from "@/lib/carrot/model";
import { carrotInstructions } from "@/lib/carrot/personality";
import { checkCarrotRateLimit } from "@/lib/carrot/rate-limit";
import { portfolioTools } from "@/lib/carrot/tools";

const responseHeaders = { "Cache-Control": "no-store" };

function errorResponse(message: string, status: number, headers?: Record<string, string>) {
  return Response.json({ error: message }, { status, headers: { ...responseHeaders, ...headers } });
}

async function readBody(request: Request): Promise<unknown> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(text + decoder.decode());
      bytes += value.byteLength;
      if (bytes > chatLimits.bodyBytes) throw new RangeError("Request body too large");
      text += decoder.decode(value, { stream: true });
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function parseMessages(body: unknown): ConversationMessage[] | null {
  if (!body || typeof body !== "object" || !("messages" in body)) return null;
  const candidates = body.messages;
  if (!Array.isArray(candidates) || !candidates.length || candidates.length > chatLimits.messages) return null;

  let totalLength = 0;
  const messages: ConversationMessage[] = [];
  for (const [index, item] of candidates.entries()) {
    const role = index % 2 === 0 ? "user" : "assistant";
    if (!item || typeof item !== "object" || item.role !== role || typeof item.content !== "string") return null;
    const limit = role === "user" ? chatLimits.userCharacters : chatLimits.assistantCharacters;
    if (item.content.length > limit || !item.content.trim()) return null;
    totalLength += item.content.length;
    if (totalLength > chatLimits.contextCharacters) return null;
    messages.push({ role, content: item.content.trim() });
  }
  return messages.at(-1)?.role === "user" ? messages : null;
}

function safeStreamError(error: unknown) {
  const status = error && typeof error === "object" && "statusCode" in error ? error.statusCode : null;
  if (status === 429 || status === 402) return chatErrors.rateLimit;
  if (status === 408 || status === 504) return chatErrors.timeout;
  return chatErrors.unavailable;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    return errorResponse(chatErrors.invalid, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return errorResponse(chatErrors.invalid, 415);
  }
  if (Number(request.headers.get("content-length")) > chatLimits.bodyBytes) {
    return errorResponse(chatErrors.invalid, 413);
  }

  let messages: ConversationMessage[] | null;
  try {
    messages = parseMessages(await readBody(request));
  } catch (error) {
    return errorResponse(chatErrors.invalid, error instanceof RangeError ? 413 : 400);
  }
  if (!messages) return errorResponse(chatErrors.invalid, 400);

  const limit = checkCarrotRateLimit();
  if (limit?.status === 429) return errorResponse(chatErrors.rateLimit, 429, { "Retry-After": limit.retryAfter });
  if (limit?.status === 503 || (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN)) {
    return errorResponse(chatErrors.unavailable, 503);
  }

  try {
    const result = streamText({
      model: carrotModel.id,
      system: carrotInstructions,
      messages,
      tools: portfolioTools,
      stopWhen: isStepCount(2),
      prepareStep: ({ stepNumber }) => stepNumber > 0 ? { toolChoice: "none" } : undefined,
      abortSignal: request.signal,
      maxOutputTokens: carrotModel.maxOutputTokens,
      timeout: carrotModel.timeout,
      maxRetries: 0,
      onError: () => {}, // SDK errors can carry the prompt or provider response.
    });
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        sendReasoning: false,
        onError: safeStreamError,
      }),
      consumeSseStream: consumeStream,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = safeStreamError(error);
    return errorResponse(message, message === chatErrors.rateLimit ? 429 : message === chatErrors.timeout ? 504 : 502);
  }
}
