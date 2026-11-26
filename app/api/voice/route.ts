const upstreamUrl = "https://carrot-voice-api.vercel.app/api/speak";
const portfolioOrigin = "https://konatsukoko.com";
const maxTextLength = 450;
const maxBodyBytes = 4096;
const windowMs = 60_000;
let windowEnd = 0;
let requests = 0;

function failure(status: number, retryAfter?: string) {
  return Response.json(
    { error: "Voice playback is unavailable." },
    { status, headers: { "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": retryAfter } : {}) } },
  );
}

async function readText(request: Request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    const parsed: unknown = JSON.parse(body + decoder.decode());
    if (!parsed || typeof parsed !== "object" || !("text" in parsed) || typeof parsed.text !== "string") return null;
    const text = parsed.text.trim();
    return text && parsed.text.length <= maxTextLength ? text : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) return failure(403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return failure(415);
  if (Number(request.headers.get("content-length")) > maxBodyBytes) return failure(413);

  const text = await readText(request);
  if (!text) return failure(400);

  if (process.env.NODE_ENV !== "development" || process.env.VERCEL === "1") {
    if (process.env.VERCEL !== "1" || process.env.CARROT_VOICE_WAF_RATE_LIMIT_ENABLED !== "true") return failure(503);
  } else {
    const now = Date.now();
    if (now >= windowEnd) {
      windowEnd = now + windowMs;
      requests = 0;
    }
    if (requests >= 18) return failure(429, String(Math.ceil((windowEnd - now) / 1000)));
    requests += 1;
  }

  try {
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: portfolioOrigin },
      body: JSON.stringify({ text }),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
    });
    if (response.status === 429) return failure(429, response.headers.get("Retry-After") ?? undefined);
    const contentType = response.headers.get("Content-Type");
    if (!response.ok || !response.body || !contentType?.startsWith("audio/")) return failure(502);

    return new Response(response.body, {
      headers: { "Content-Type": contentType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return failure(502);
  }
}
