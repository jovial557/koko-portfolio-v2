import "server-only";

export const carrotModel = {
  id: "google/gemini-2.5-flash-lite",
  maxOutputTokens: 220,
  timeout: { totalMs: 20_000, firstChunkMs: 12_000, chunkMs: 8_000 },
} as const;
