"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { speechChunks, timedWords, type TextRange, type TimedWord } from "./voice-timing";

const maxCachedClips = 24;
const maxCachedClipBytes = 512_000;
type Clip = { blob: Blob; alignment?: unknown };

async function readClip(response: Response): Promise<Clip> {
  const type = response.headers.get("Content-Type");
  if (response.ok && type?.startsWith("audio/")) return { blob: await response.blob() };
  if (!response.ok || !type?.startsWith("application/json")) throw new Error("Carrot voice unavailable");

  const { audio_base64, alignment } = await response.json();
  if (typeof audio_base64 !== "string" || audio_base64.length > 3_000_000) {
    throw new Error("Invalid voice clip");
  }
  return { blob: new Blob([Uint8Array.from(atob(audio_base64), (char) => char.charCodeAt(0))], { type: "audio/mpeg" }), alignment };
}

async function playClip(
  blob: Blob,
  signal: AbortSignal,
  words: TimedWord[],
  highlight: (word: TextRange | null) => void,
) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  let cancel: (() => void) | undefined;
  let frame = 0;
  let previous: TextRange | null = null;
  function update() {
    const time = audio.currentTime;
    const current = words.findLast(({ from, to }) => time >= from && time < to) ?? null;
    if (current?.start !== previous?.start || current?.end !== previous?.end) {
      previous = current;
      highlight(current);
    }
    frame = requestAnimationFrame(update);
  }
  function clearHighlight() {
    cancelAnimationFrame(frame);
    previous = null;
    highlight(null);
  }
  if (words.length) {
    audio.addEventListener("playing", () => {
      cancelAnimationFrame(frame);
      update();
    });
    for (const event of ["pause", "waiting", "seeking"]) audio.addEventListener(event, clearHighlight);
  }
  try {
    await new Promise<void>((resolve, reject) => {
      cancel = () => {
        audio.pause();
        resolve();
      };
      signal.addEventListener("abort", cancel, { once: true });
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("Audio playback failed"));
      void audio.play().catch(reject);
    });
  } finally {
    if (words.length) clearHighlight();
    if (cancel) signal.removeEventListener("abort", cancel);
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(url);
  }
}

export function useCarrotVoice() {
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<number | null>(null);
  const request = useRef<{ id: number; controller: AbortController } | null>(null);
  const clips = useRef(new Map<string, Clip>());
  const [highlight, setHighlight] = useState<(TextRange & { id: number }) | null>(null);

  const stop = useCallback(() => {
    request.current?.controller.abort();
    request.current = null;
    setSpeaking(null);
    setHighlight(null);
    setLoading(false);
  }, []);

  useEffect(() => () => request.current?.controller.abort(), []);

  function clear() {
    stop();
    clips.current.clear();
    setFailed(null);
  }

  async function toggle(id: number, text: string) {
    const wasActive = request.current?.id === id;
    stop();
    if (wasActive) return;
    const chunks = speechChunks(text);
    if (!chunks.length) return;

    const controller = new AbortController();
    const { signal } = controller;
    request.current = { id, controller };
    setSpeaking(id);
    setFailed((current) => current === id ? null : current);

    try {
      for (const chunk of chunks) {
        const segment = chunk.text;
        if (signal.aborted) return;
        let clip = clips.current.get(segment);
        if (clip) {
          clips.current.delete(segment);
          clips.current.set(segment, clip);
        } else {
          setLoading(true);
          const response = await fetch("/api/voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: segment }),
            signal,
          });
          clip = await readClip(response);
          if (signal.aborted) return;
          if (!clip.blob.size) throw new Error("Empty voice clip");
          if (clip.blob.size <= maxCachedClipBytes) {
            clips.current.set(segment, clip);
            if (clips.current.size > maxCachedClips) {
              const oldest = clips.current.keys().next().value;
              if (oldest !== undefined) clips.current.delete(oldest);
            }
          }
        }
        setLoading(false);
        try {
          await playClip(clip.blob, signal, timedWords(chunk, clip.alignment), (word) => {
            if (request.current?.controller === controller) setHighlight(word && { ...word, id });
          });
        } catch (error) {
          clips.current.delete(segment);
          throw error;
        }
      }
    } catch {
      if (!signal.aborted) setFailed(id);
    } finally {
      if (request.current?.controller === controller) stop();
    }
  }

  return { speaking, loading, failed, highlight, toggle, stop, clear };
}
