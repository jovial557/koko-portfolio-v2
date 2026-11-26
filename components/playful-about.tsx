"use client";

import Image from "next/image";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Preview = { src: string; alt: string };
type Previews = Record<string, Preview>;
type Selection = {
  id: string;
  trigger: HTMLElement;
  point: Point;
  followsPointer: boolean;
  size?: Size;
};

type PreviewControls = {
  previews: Previews;
  activeId: string | null;
  reveal: (id: string, trigger: HTMLElement, point?: Point) => void;
  move: (id: string, point: Point) => void;
  leave: (id: string, pointerOnly?: boolean) => void;
};

const PreviewContext = createContext<PreviewControls | null>(null);
const cursorSpring = { stiffness: 260, damping: 30 };
const imageSpring = { type: "spring", stiffness: 320, damping: 26, mass: 0.65 } as const;
const viewportMargin = 32;

function preloadImage(src: string) {
  const image = new window.Image();
  image.src = src;
  return image.decode().then(() => image.naturalWidth / image.naturalHeight);
}

function positionPreview(point: Point, size: Size) {
  const { clientWidth, clientHeight } = document.documentElement;
  const above = point.y - size.height - 28;
  const top = above >= viewportMargin ? above : point.y + 38;

  return {
    x: Math.max(viewportMargin, Math.min(point.x - size.width / 2, clientWidth - size.width - viewportMargin)),
    y: Math.max(viewportMargin, Math.min(top, clientHeight - size.height - viewportMargin)),
  };
}

export function PlayfulAbout({
  previews,
  children,
  maxWidth = 220,
  maxHeight = 260,
}: {
  previews: Previews;
  children: ReactNode;
  maxWidth?: number;
  maxHeight?: number;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<(Preview & Size & { id: string }) | null>(null);
  const selection = useRef<Selection | null>(null);
  const preloaded = useRef(new Map<string, Promise<number>>());
  const reduced = useReducedMotion();
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, cursorSpring);
  const y = useSpring(targetY, cursorSpring);

  const getRatio = useCallback((src: string) => {
    const cached = preloaded.current.get(src);
    if (cached) return cached;
    const loading = preloadImage(src);
    preloaded.current.set(src, loading);
    return loading;
  }, []);

  const close = useCallback(() => {
    selection.current = null;
    setActiveId(null);
  }, []);

  useEffect(() => {
    for (const { src } of Object.values(previews)) {
      void getRatio(src).catch(() => {});
    }

    function dismissOutside(event: PointerEvent) {
      if (selection.current && !selection.current.trigger.contains(event.target as Node)) close();
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("pointerdown", dismissOutside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", dismissOnEscape);
    return () => {
      window.removeEventListener("pointerdown", dismissOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", dismissOnEscape);
      selection.current = null;
    };
  }, [close, getRatio, previews]);

  function position(point: Point, size: Size, snap = false) {
    const next = positionPreview(point, size);
    targetX.set(next.x);
    targetY.set(next.y);
    if (snap || reduced) {
      x.jump(next.x);
      y.jump(next.y);
    }
  }

  function reveal(id: string, trigger: HTMLElement, point?: Point) {
    const image = previews[id];
    if (!image) return;

    const bounds = trigger.getBoundingClientRect();
    const next: Selection = {
      id,
      trigger,
      point: point ?? { x: bounds.left + bounds.width / 2, y: bounds.top },
      followsPointer: Boolean(point),
    };
    selection.current = next;
    setActiveId(id);

    void getRatio(image.src).then((ratio) => {
      if (selection.current !== next) return;

      const { clientWidth, clientHeight } = document.documentElement;
      const availableWidth = Math.max(1, Math.min(maxWidth, clientWidth - 2 * viewportMargin));
      const availableHeight = Math.max(1, Math.min(maxHeight, clientHeight - 2 * viewportMargin));
      const width = Math.min(availableWidth, availableHeight * ratio);
      const size = { width, height: width / ratio };

      next.size = size;
      position(next.point, size, true);
      setPreview({ id, ...image, ...size });
    }).catch(() => {
      if (selection.current === next) close();
    });
  }

  function move(id: string, point: Point) {
    const current = selection.current;
    if (current?.id !== id || !current.followsPointer) return;
    current.point = point;
    if (current.size) position(point, current.size);
  }

  function leave(id: string, pointerOnly = false) {
    const current = selection.current;
    if (current?.id === id && (!pointerOnly || current.followsPointer)) close();
  }

  return (
    <PreviewContext.Provider value={{ previews, activeId, reveal, move, leave }}>
      {children}
      {preview && createPortal(
        <motion.div className="intro-preview-position" style={{ x, y }}>
          <AnimatePresence>
            {activeId === preview.id && (
              <motion.div
                key={preview.id}
                className="intro-preview-frame"
                initial={{ opacity: 0, scale: reduced ? 1 : 0.92, rotate: reduced ? 0 : -9, y: reduced ? 0 : 14 }}
                animate={{ opacity: 1, scale: 1, rotate: reduced ? 0 : -5, y: 0 }}
                exit={{ opacity: 0, scale: reduced ? 1 : 0.96, rotate: reduced ? 0 : -3, y: reduced ? 0 : 8 }}
                transition={reduced ? { duration: 0.1 } : imageSpring}
                style={{ width: preview.width, height: preview.height }}
              >
                <Image src={preview.src} alt={preview.alt} fill unoptimized draggable={false} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>,
        document.body,
      )}
    </PreviewContext.Provider>
  );
}

export function AboutPreviewTrigger({
  id,
  children,
  underline = true,
}: {
  id: string;
  children: ReactNode;
  underline?: boolean;
}) {
  const controls = useContext(PreviewContext);
  const descriptionId = useId();
  const pointerType = useRef<string | null>(null);
  const decoration = underline ? "intro-underline" : undefined;
  if (!controls?.previews[id]) return <span className={decoration}>{children}</span>;
  const { activeId, reveal, move, leave } = controls;

  function toggle(trigger: HTMLElement) {
    if (activeId === id) leave(id);
    else reveal(id, trigger);
  }

  // A non-atomic inline element preserves line breaks within each phrase.
  return (
    <span
      className={underline ? "intro-preview-trigger intro-underline" : "intro-preview-trigger"}
      role="button"
      tabIndex={0}
      aria-expanded={activeId === id}
      aria-describedby={descriptionId}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") reveal(id, event.currentTarget, { x: event.clientX, y: event.clientY });
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") move(id, { x: event.clientX, y: event.clientY });
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") leave(id, true);
      }}
      onPointerDown={(event) => {
        pointerType.current = event.pointerType;
      }}
      onClick={(event) => {
        if (pointerType.current !== "mouse" || event.detail === 0) toggle(event.currentTarget);
        pointerType.current = null;
      }}
      onFocus={(event) => {
        if (pointerType.current === null && event.currentTarget.matches(":focus-visible")) {
          reveal(id, event.currentTarget);
        }
      }}
      onBlur={() => {
        pointerType.current = null;
        leave(id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!event.repeat) toggle(event.currentTarget);
        }
      }}
    >
      {children}
      <span id={descriptionId} hidden>{controls.previews[id].alt}</span>
    </span>
  );
}
