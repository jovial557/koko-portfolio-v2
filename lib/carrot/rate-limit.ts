import "server-only";

// Development safeguard for localhost. Deployed traffic is limited by Vercel Firewall.
const windowMs = 60_000;
const localLimit = 12;
let resetAt = 0;
let requests = 0;

export function checkCarrotRateLimit(): { status: 429; retryAfter: string } | { status: 503 } | null {
  if (process.env.VERCEL === "1" || process.env.NODE_ENV !== "development") {
    return process.env.VERCEL === "1" && process.env.CARROT_WAF_RATE_LIMIT_ENABLED === "true"
      ? null
      : { status: 503 };
  }

  const now = Date.now();
  if (now >= resetAt) {
    resetAt = now + windowMs;
    requests = 0;
  }
  if (requests >= localLimit) {
    return { status: 429, retryAfter: String(Math.ceil((resetAt - now) / 1000)) };
  }
  requests += 1;
  return null;
}
