"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const voiceUrl = "/api/voice";
const segmentLimit = 400;
const maxCachedClips = 24;
const maxCachedClipBytes = 512_000;
const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

function cleanSpeech(text: string) {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\b(?:[a-z][a-z0-9+.-]*:\/\/|mailto:)[^\s<>]+/gi, "")
    .replace(/\b(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s<>]*)?/gi, "")
    .replace(/(?<!\S)\/[\w-]+(?:\/[\w-]+)*\b/g, "")
    .replace(/[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\u200D\uFE0E\uFE0F]/gu, "")
    .replace(/^\s*(?:#{1,6}\s+|>\s*|(?:[-+*]|\d+[.)])\s+)/gm, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function chunks(text: string) {
  const segments: string[] = [];
  let current = "";
  for (const { segment } of sentences.segment(text)) {
    const sentence = segment.trim();
    const combined = current ? `${current} ${sentence}` : sentence;
    if (combined.length <= segmentLimit) {
      current = combined;
      continue;
    }
    if (current) segments.push(current);
    current = "";
    for (const word of sentence.split(/\s+/)) {
      if (current && current.length + word.length + 1 > segmentLimit) {
        segments.push(current);
        current = "";
      }
      let remaining = word;
      while (remaining.length > segmentLimit) {
        let end = segmentLimit;
        if (/[\uD800-\uDBFF]/.test(remaining[end - 1])) end -= 1;
        segments.push(remaining.slice(0, end));
        remaining = remaining.slice(end);
      }
      current = current ? `${current} ${remaining}` : remaining;
    }
  }
  if (current) segments.push(current);
  return segments;
}

async function playClip(blob: Blob, signal: AbortSignal) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  let cancel: (() => void) | undefined;
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
  const clips = useRef(new Map<string, Blob>());

  const stop = useCallback(() => {
    request.current?.controller.abort();
    request.current = null;
    setSpeaking(null);
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
    const clean = cleanSpeech(text);
    if (!clean) return;

    const controller = new AbortController();
    const { signal } = controller;
    request.current = { id, controller };
    setSpeaking(id);
    setFailed((current) => current === id ? null : current);

    try {
      for (const segment of chunks(clean)) {
        if (signal.aborted) return;
        let blob = clips.current.get(segment);
        if (blob) {
          clips.current.delete(segment);
          clips.current.set(segment, blob);
        } else {
          setLoading(true);
          const response = await fetch(voiceUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: segment }),
            signal,
          });
          if (!response.ok || !response.headers.get("Content-Type")?.startsWith("audio/")) {
            throw new Error("Carrot voice unavailable");
          }
          blob = await response.blob();
          if (signal.aborted) return;
          if (!blob.size) throw new Error("Empty voice clip");
          if (blob.size <= maxCachedClipBytes) {
            clips.current.set(segment, blob);
            if (clips.current.size > maxCachedClips) {
              const oldest = clips.current.keys().next().value;
              if (oldest !== undefined) clips.current.delete(oldest);
            }
          }
        }
        setLoading(false);
        try {
          await playClip(blob, signal);
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

  return { speaking, loading, failed, toggle, stop, clear };
}
