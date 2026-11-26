"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { chatLimits, type ConversationMessage } from "@/lib/carrot/chat-contract";
import { approvedProjectLinks, isApprovedProjectPath } from "@/lib/carrot/project-links";
import { replyErrorMessage, streamReply } from "./stream-reply";
import { useCarrotVoice } from "./use-carrot-voice";
import { displayWords, type TextRange } from "./voice-timing";
import styles from "./carrot.module.css";

const suggestions = [
  "What has Kokona been working on lately?",
  "How does Kokona approach a new challenge?",
  "What's it like working with Kokona?",
];
const projectPaths = new RegExp(
  `(?<!\\S)(${Object.keys(approvedProjectLinks).join("|")})(?=[\\s.,!?]|$)`,
  "g",
);
const motionEase = [0.22, 1, 0.36, 1] as const;
type ChatMessage = ConversationMessage & { id: number };
type PendingReply = { id: number; controller: AbortController };

function recentContext(completed: ConversationMessage[], question: string): ConversationMessage[] {
  const recent: ConversationMessage[] = [{ role: "user", content: question }];
  let remaining = chatLimits.contextCharacters - question.length;
  for (let index = completed.length - 2; index >= 0 && recent.length + 2 <= chatLimits.messages; index -= 2) {
    const pair = completed.slice(index, index + 2);
    const length = pair[0].content.length + pair[1].content.length;
    if (length > remaining) break;
    remaining -= length;
    recent.unshift(...pair);
  }
  return recent;
}

function Reply({ text, highlight }: { text: string; highlight: TextRange | null }) {
  function renderWords(value: string, offset: number) {
    let cursor = 0;
    return displayWords(value).flatMap(({ segment, index }) => {
      const start = offset + index;
      const end = start + segment.length;
      const isSpoken = highlight !== null && start <= highlight.start && end > highlight.start;
      const prefix = value.slice(cursor, index);
      cursor = index + segment.length;
      return [prefix, (
        <span key={start} className={styles.spokenWord} data-spoken={isSpoken || undefined}>{segment}</span>
      )];
    }).concat(value.slice(cursor));
  }

  let cursor = 0;
  return text.split(projectPaths).flatMap((part, index) => {
    const start = cursor;
    cursor += part.length;
    if (!isApprovedProjectPath(part)) return renderWords(part, start);
    const { href, label } = approvedProjectLinks[part];
    return <a key={`project-${index}`} href={href}>{label}</a>;
  });
}

export function CarrotChat({ open, anchor, reduced, onHide }: {
  open: boolean;
  anchor: RefObject<HTMLButtonElement | null>;
  reduced: boolean;
  onHide: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const pending = useRef<PendingReply | null>(null);
  const completed = useRef<ConversationMessage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "waiting" | "streaming">("idle");
  const [streamingId, setStreamingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const thinking = status === "waiting";
  const voice = useCarrotVoice();

  useLayoutEffect(() => {
    const layer = viewport.current;
    const bunny = anchor.current;
    if (!open || !layer || !bunny) return;

    const visible = window.visualViewport;
    function position() {
      if (!layer || !bunny) return;
      const safe = layer.getBoundingClientRect();
      const visualLeft = visible?.offsetLeft ?? 0;
      const visualTop = visible?.offsetTop ?? 0;
      const left = Math.max(safe.left, visualLeft) + 12;
      const right = Math.min(safe.right, visualLeft + (visible?.width ?? document.documentElement.clientWidth)) - 12;
      const top = Math.max(safe.top, visualTop) + 12;
      const bottom = Math.min(safe.bottom, visualTop + (visible?.height ?? window.innerHeight)) - 12;
      const mobile = document.documentElement.clientWidth < 600;
      const width = Math.max(1, mobile ? right - left : Math.min(expanded ? 680 : 520, right - left));
      const height = Math.max(1, Math.min(
        expanded ? 520 : 340,
        (visible?.height ?? window.innerHeight) * (mobile ? 0.45 : 0.55),
        bottom - top,
      ));
      const bunnyRect = bunny.getBoundingClientRect();
      const center = (bunnyRect.left + bunnyRect.right) / 2;
      const x = Math.max(left, Math.min(center - width / 2, right - width));
      const y = Math.max(top, Math.min(bunnyRect.top - 8, bottom) - height);

      layer.style.setProperty("--terminal-x", `${x - safe.left}px`);
      layer.style.setProperty("--terminal-y", `${y - safe.top}px`);
      layer.style.setProperty("--terminal-width", `${width}px`);
      layer.style.setProperty("--terminal-height", `${height}px`);
      layer.style.setProperty("--terminal-origin", `${Math.max(12, Math.min(center - x, width - 12))}px 100%`);
    }

    position();
    const frame = requestAnimationFrame(position);
    const observer = new ResizeObserver(position);
    observer.observe(bunny);
    window.addEventListener("resize", position);
    visible?.addEventListener("resize", position);
    visible?.addEventListener("scroll", position);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", position);
      visible?.removeEventListener("resize", position);
      visible?.removeEventListener("scroll", position);
    };
  }, [anchor, expanded, open]);

  useEffect(() => {
    if (open) closeButton.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    const container = scroll.current;
    if (!open || !container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: reduced || !messages.length ? "instant" : "smooth" });
  }, [messages, error, open, reduced, thinking]);

  useEffect(() => () => pending.current?.controller.abort(), []);

  function cancelPending() {
    voice.stop();
    const request = pending.current;
    if (request) {
      pending.current = null;
      request.controller.abort();
      setMessages((current) => current.filter((message) => message.id !== request.id));
    }
    setStreamingId(null);
    setStatus("idle");
  }

  function close() {
    cancelPending();
    onHide();
  }

  function reset() {
    cancelPending();
    voice.clear();
    completed.current = [];
    setMessages([]);
    setDraft("");
    setError(null);
  }

  async function send(value: string) {
    const question = value.trim().slice(0, chatLimits.userCharacters);
    if (!question || pending.current) return;

    const user: ChatMessage = { id: nextId.current++, role: "user", content: question };
    const request = { id: nextId.current++, controller: new AbortController() };
    pending.current = request;
    setMessages((current) => [...current, user].slice(-24));
    setDraft("");
    setError(null);
    setStreamingId(request.id);
    setStatus("waiting");

    try {
      const answer = await streamReply(
        recentContext(completed.current, question),
        request.controller.signal,
        (text) => {
          if (pending.current !== request) return;
          setStatus("streaming");
          const assistant: ChatMessage = { id: request.id, role: "assistant", content: text };
          setMessages((current) => current.at(-1)?.id === request.id
            ? [...current.slice(0, -1), assistant]
            : [...current, assistant].slice(-24)
          );
        },
      );
      if (pending.current !== request) return;
      completed.current = [
        ...completed.current,
        { role: "user" as const, content: question },
        { role: "assistant" as const, content: answer },
      ].slice(-(chatLimits.messages - 1));
    } catch (cause) {
      if (pending.current !== request) return;
      setMessages((current) => current.filter((message) => message.id !== request.id));
      setError(replyErrorMessage(cause));
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setStreamingId(null);
        setStatus("idle");
      }
    }
  }

  return (
    <div className={styles.terminalLayer} ref={viewport} inert={!open}>
      <AnimatePresence>
        {open && (
          <motion.section
            className={styles.terminal}
            role="dialog"
            aria-label="CarrotLLM"
            initial={reduced ? false : { opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: motionEase }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                close();
              }
            }}
          >
            <header className={styles.titleBar}>
              <div className={styles.trafficLights}>
                <button ref={closeButton} type="button" data-color="red" aria-label="Close chat" onClick={close}>×</button>
                <button type="button" data-color="yellow" aria-label="Minimize chat" onClick={onHide}>−</button>
                <button
                  type="button"
                  data-color="green"
                  aria-label={expanded ? "Restore compact window" : "Expand chat window"}
                  aria-pressed={expanded}
                  onClick={() => setExpanded((current) => !current)}
                >{expanded ? "−" : "+"}</button>
              </div>
              <h2>CarrotLLM</h2>
              <button type="button" className={styles.reset} aria-label="Reset chat" onClick={reset}>↺</button>
            </header>

            <div className={styles.conversation} ref={scroll} role="log" aria-label="Conversation">
              {messages.length === 0 ? (
                <>
                  <p className={styles.initialized}>Carrot initialized successfully.</p>
                  <div className={styles.suggestions} aria-label="Suggested questions">
                    {suggestions.map((question) => (
                      <button type="button" key={question} onClick={() => void send(question)}>
                        <span aria-hidden="true">❯</span> {question}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                messages.map(({ id, role, content }) => (
                  <div key={id} className={styles.message} data-role={role}>
                    <span className={styles.messagePrefix} aria-label={role === "assistant" ? "Carrot" : "You"}>
                      {role === "assistant" ? "carrot ~" : "❯"}
                    </span>
                    <div className={styles.messageText}>
                      {role === "assistant" ? <Reply text={content} highlight={voice.highlight?.id === id ? voice.highlight : null} /> : content}
                      {role === "assistant" && id !== streamingId && (
                        <button
                          className={styles.listen}
                          type="button"
                          onClick={() => void voice.toggle(id, content)}
                          aria-label={voice.speaking === id
                            ? voice.loading ? "Cancel voice loading" : "Stop reading message"
                            : voice.failed === id ? "Retry Carrot voice" : "Read message aloud"}
                          title={voice.failed === id ? "Retry Carrot voice" : undefined}
                        >
                          {voice.speaking === id
                            ? voice.loading ? <span className={styles.spinner} aria-hidden="true" /> : "■"
                            : voice.failed === id ? "↻" : "◖))"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              {thinking && (
                <div className={styles.thinking} role="status">
                  <span className={styles.spinner} aria-hidden="true" />
                  Thinking...
                </div>
              )}
              {error && <p role="alert" className={styles.error}>{error}</p>}
            </div>

            <form
              className={styles.prompt}
              onSubmit={(event) => { event.preventDefault(); void send(draft); }}
            >
              <span aria-hidden="true">❯</span>
              <input
                aria-label="Ask about Koko"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask me anything about Kokona..."
                maxLength={chatLimits.userCharacters}
              />
              <button type="submit" aria-label="Send message" disabled={!draft.trim() || status !== "idle"}>↵</button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
