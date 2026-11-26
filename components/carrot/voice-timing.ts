const words = new Intl.Segmenter("en", { granularity: "word" });
const sentences = new Intl.Segmenter("en", { granularity: "sentence" });
const segmentLimit = 400;

export type TextRange = { start: number; end: number };
type SpeechChunk = { text: string; source: TextRange[] };
export type TimedWord = TextRange & { from: number; to: number };

export function displayWords(text: string) {
  return [...words.segment(text)].filter((word) => word.isWordLike);
}

export function speechChunks(original: string): SpeechChunk[] {
  let text = original;
  let source = Array.from({ length: original.length }, (_, index) => ({ start: index, end: index + 1 }));

  // Preserve offsets into the answer through every speech-only transformation.
  function replace(pattern: RegExp, replacement = "", captureLabel = false) {
    let nextText = "";
    const nextSource: TextRange[] = [];
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      nextText += text.slice(cursor, start);
      nextSource.push(...source.slice(cursor, start));
      if (captureLabel) {
        const label = match[1];
        const labelStart = start + match[0].indexOf("[") + 1;
        nextText += label;
        nextSource.push(...source.slice(labelStart, labelStart + label.length));
      } else if (replacement) {
        nextText += replacement;
        const range = { start: source[start].start, end: source[end - 1].end };
        for (let index = 0; index < replacement.length; index += 1) nextSource.push(range);
      }
      cursor = end;
    }
    nextText += text.slice(cursor);
    nextSource.push(...source.slice(cursor));
    text = nextText;
    source = nextSource;
  }

  replace(/!?\[([^\]]*)\]\([^)]*\)/g, "", true);
  replace(/\b(?:[a-z][a-z0-9+.-]*:\/\/|mailto:)[^\s<>]+/gi);
  replace(/\b(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s<>]*)?/gi);
  replace(/(?<!\S)\/[\w-]+(?:\/[\w-]+)*\b/g);
  replace(/[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\u200D\uFE0E\uFE0F]/gu);
  replace(/^\s*(?:#{1,6}\s+|>\s*|(?:[-+*]|\d+[.)])\s+)/gm);
  replace(/[`*_~]/g);
  replace(/\bFIT\b/g, "Fashion Institute of Technology");
  replace(/\s+/g, " ");

  const boundaries = [...sentences.segment(text)].map(({ index, segment }) => index + segment.trimEnd().length);
  const chunks: SpeechChunk[] = [];
  let start = 0;
  while (start < text.length) {
    if (text[start] === " ") {
      start += 1;
      continue;
    }
    const limit = Math.min(text.length, start + segmentLimit);
    const endOfSentence = boundaries.findLast((end) => end > start && end <= limit);
    const wordBoundary = text.lastIndexOf(" ", limit);
    let end = endOfSentence ?? (wordBoundary > start ? wordBoundary : limit);
    if (/[\uD800-\uDBFF]/.test(text[end - 1])) end -= 1;
    if (end <= start) break;
    chunks.push({ text: text.slice(start, end), source: source.slice(start, end) });
    start = end;
  }
  return chunks;
}

export function timedWords(chunk: SpeechChunk, alignment: unknown): TimedWord[] {
  if (!alignment || typeof alignment !== "object") return [];
  const data = alignment as Record<string, unknown>;
  const characters = data.characters;
  const starts = data.character_start_times_seconds;
  const ends = data.character_end_times_seconds;
  if (!Array.isArray(characters) || !Array.isArray(starts) || !Array.isArray(ends) ||
      characters.length !== starts.length || characters.length !== ends.length ||
      characters.some((char) => typeof char !== "string" || !char) ||
      characters.join("") !== chunk.text) return [];

  const byOffset: { from: number; to: number }[] = [];
  for (let index = 0; index < characters.length; index += 1) {
    const from = starts[index];
    const to = ends[index];
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from ||
        (index > 0 && from < starts[index - 1])) return [];
    for (let unit = 0; unit < characters[index].length; unit += 1) byOffset.push({ from, to });
  }

  return displayWords(chunk.text).flatMap(({ index, segment }) => {
    const last = index + segment.length - 1;
    const from = byOffset[index].from;
    const to = byOffset[last].to;
    return from < to ? [{ start: chunk.source[index].start, end: chunk.source[last].end, from, to }] : [];
  });
}
