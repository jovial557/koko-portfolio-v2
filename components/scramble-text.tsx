"use client";

import { useEffect, useRef, useState } from "react";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const tickDuration = 38;
const ticksPerCharacter = 3;

export function ScrambleText({ label, href }: { label: string; href?: string }) {
  const [scrambled, setScrambled] = useState<{ label: string; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function stop() {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    setScrambled(null);
  }

  function start() {
    stop();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const characters = Array.from(label);
    if (!characters.length) return;
    let tick = 0;

    timer.current = setInterval(() => {
      tick += 1;
      const resolved = Math.floor(tick / ticksPerCharacter);
      if (resolved >= characters.length) {
        stop();
        return;
      }

      const text = characters.map((character, index) =>
        character === " " || index < resolved
          ? character
          : alphabet[Math.floor(Math.random() * alphabet.length)]
      ).join("");
      setScrambled({ label, text });
    }, tickDuration);
  }

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function onMotionChange(event: MediaQueryListEvent) {
      if (event.matches) stop();
    }
    reducedMotion.addEventListener("change", onMotionChange);
    return () => {
      reducedMotion.removeEventListener("change", onMotionChange);
      if (timer.current !== null) clearInterval(timer.current);
      timer.current = null;
    };
  }, [label]);

  const display = scrambled?.label === label ? scrambled.text : null;
  const content = (
    <span style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
      <span style={{ opacity: display === null ? 1 : 0 }}>{label}</span>
      {display !== null && (
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {display}
        </span>
      )}
    </span>
  );

  const events = {
    onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" && window.matchMedia("(any-hover: hover)").matches) start();
    },
    onPointerLeave: stop,
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      if (event.currentTarget.matches(":focus-visible")) start();
    },
    onBlur: stop,
  };

  return href ? (
    <a href={href} style={{ textDecorationLine: "none" }} {...events}>{content}</a>
  ) : (
    <span aria-disabled="true" tabIndex={0} {...events}>{content}</span>
  );
}
