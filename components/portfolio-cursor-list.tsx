"use client";

import { isProjectId, projectRegistry } from "@/lib/carrot/project-links";

import Image from "next/image";
import { AnimatePresence, motion, useIsPresent, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal, preload } from "react-dom";

type Project = {
  id: string;
  number: string;
  title: string;
  category: string;
  href: string | null;
  image: string | null;
};

const settings = {
  width: 350,
  ratio: 1.34,
  radius: 6,
  tilt: -5,
  offset: 32,
  margin: 12,
  origin: { x: 0.5, y: 0.85 },
  breakpoint: 640,
  shift: 14,
  inactiveOpacity: 0.42,
  follow: { stiffness: 260, damping: 30, mass: 0.7 },
  preview: { type: "spring", stiffness: 440, damping: 30, mass: 0.5 },
  row: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
} as const;

// The preview is portaled outside the list, so it owns its positioning and media styles.
const previewMediaStyle: CSSProperties = {
  overflow: "hidden",
  background: "var(--surface)",
  borderRadius: settings.radius,
};

const rowButtonStyle: CSSProperties = {
  width: "100%",
  color: "inherit",
  textAlign: "left",
  cursor: "pointer",
  touchAction: "manipulation",
};

type Limits = { minX: number; maxX: number; minY: number; maxY: number };
type Size = { width: number; height: number };
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

// Extend Framer's rotated bounds to cover its transform origin and entrance/exit offsets.
function rotatedBounds(reduced: boolean) {
  const height = 1 / settings.ratio;
  const pivot = { x: settings.origin.x, y: height * settings.origin.y };
  const angles = reduced ? [0] : [settings.tilt - 4, settings.tilt, settings.tilt + 2];
  const corners = angles.flatMap((angle) => {
    const radians = angle * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return [0, 1].flatMap((x) => [0, height].map((y) => ({
      x: pivot.x + (x - pivot.x) * cosine - (y - pivot.y) * sine,
      y: pivot.y + (x - pivot.x) * sine + (y - pivot.y) * cosine,
    })));
  });

  return {
    left: Math.min(...corners.map((corner) => corner.x)),
    right: Math.max(...corners.map((corner) => corner.x)),
    top: Math.min(...corners.map((corner) => corner.y)),
    bottom: Math.max(...corners.map((corner) => corner.y)),
  };
}

function fitPreview(reduced: boolean) {
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
  const viewportHeight = viewport?.height ?? document.documentElement.clientHeight;
  const { margin } = settings;
  const bounds = rotatedBounds(reduced);
  const verticalTravel = reduced ? 0 : 14;
  const width = Math.min(
    settings.width,
    (viewportWidth - 2 * margin) / (bounds.right - bounds.left),
    (viewportHeight - 2 * margin - verticalTravel) / (bounds.bottom - bounds.top),
  );

  if (width <= 0) return null;

  return {
    size: { width, height: width / settings.ratio },
    limits: {
      minX: viewportLeft + margin - bounds.left * width,
      maxX: viewportLeft + viewportWidth - margin - bounds.right * width,
      minY: viewportTop + margin - bounds.top * width,
      maxY: viewportTop + viewportHeight - margin - bounds.bottom * width - verticalTravel,
    },
  };
}

function placePreview(px: number, py: number, size: Size, limits: Limits, side: "left" | "right") {
  const right = px + settings.offset;
  const left = px - settings.offset - size.width;
  let nextSide = side;
  if (side === "right" && right > limits.maxX && left >= limits.minX) nextSide = "left";
  if (side === "left" && left < limits.minX && right <= limits.maxX) nextSide = "right";
  return {
    x: clamp(nextSide === "right" ? right : left, limits.minX, limits.maxX),
    y: clamp(py - size.height / 2, limits.minY, limits.maxY),
    side: nextSide,
  };
}

function PreviewContent({ project, decorative = false }: { project: Project; decorative?: boolean }) {
  return project.image ? (
    <Image src={project.image} alt={decorative ? "" : project.title} fill unoptimized draggable={false} style={{ objectFit: "cover" }} />
  ) : (
    <div
      className="project-preview-placeholder"
      style={{
        display: "grid",
        minHeight: "100%",
        placeItems: "center",
        border: "1px solid var(--line)",
        borderRadius: "inherit",
        color: "var(--muted)",
      }}
    >
      {project.title}
    </div>
  );
}

function InlinePreview({ id, project, viewProject, reduced }: {
  id: string;
  project: Project;
  viewProject: string;
  reduced: boolean;
}) {
  const present = useIsPresent();
  return (
    <motion.div
      id={id}
      className="project-inline-preview"
      style={{ overflow: "hidden" }}
      inert={!present}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={reduced ? { duration: 0 } : settings.row}
    >
      <div className="project-inline-preview-content" style={{ paddingBlock: "4px 24px" }}>
        <div className="project-preview-media" style={{ ...previewMediaStyle, position: "relative", aspectRatio: settings.ratio }}>
          <PreviewContent project={project} />
        </div>
        {project.href && (
          <a
            href={project.href}
            style={{
              display: "inline-block",
              marginTop: 12,
              paddingBlock: 8,
              fontSize: "0.8125rem",
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            {viewProject}
          </a>
        )}
      </div>
    </motion.div>
  );
}

export function PortfolioCursorList({ projects, viewProject }: { projects: Project[]; viewProject: string }) {
  const list = useRef<HTMLOListElement>(null);
  const side = useRef<"left" | "right">("right");
  const active = useRef<string | null>(null);
  const geometry = useRef<ReturnType<typeof fitPreview>>(null);
  const [inline, setInline] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [{ id: hovered, revision }, setSelection] = useState({ id: null as string | null, revision: 0 });
  const [size, setSize] = useState<Size | null>(null);
  const reduced = Boolean(useReducedMotion());
  const uid = useId();
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const springX = useSpring(targetX, settings.follow);
  const springY = useSpring(targetY, settings.follow);
  const limits = useMotionValue<Limits>({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  const x = useTransform(() => clamp(springX.get(), limits.get().minX, limits.get().maxX));
  const y = useTransform(() => clamp(springY.get(), limits.get().minY, limits.get().maxY));

  const hide = useCallback(() => {
    active.current = null;
    side.current = "right";
    setSelection((current) => current.id === null ? current : { id: null, revision: current.revision });
  }, []);

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const touch = window.matchMedia("(any-hover: none) and (any-pointer: coarse)");
    let previous: boolean | undefined;
    const measure = () => {
      const next = element.getBoundingClientRect().width <= settings.breakpoint || touch.matches;
      if (next === previous) return;
      previous = next;
      setInline(next);
      if (next) hide();
      else setOpen(null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    touch.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      touch.removeEventListener("change", measure);
    };
  }, [hide]);

  useEffect(() => {
    const viewport = window.visualViewport;
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("blur", hide);
    window.addEventListener("resize", hide);
    viewport?.addEventListener("resize", hide);
    viewport?.addEventListener("scroll", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
      window.removeEventListener("resize", hide);
      viewport?.removeEventListener("resize", hide);
      viewport?.removeEventListener("scroll", hide);
    };
  }, [hide]);

  function follow(id: string, clientX: number, clientY: number, forceSnap = false) {
    const snap = active.current === null || forceSnap;
    if (snap || !geometry.current) {
      geometry.current = fitPreview(reduced);
      if (!geometry.current) return;
      limits.set(geometry.current.limits);
      setSize(geometry.current.size);
    }
    const next = placePreview(clientX, clientY, geometry.current.size, geometry.current.limits, side.current);
    side.current = next.side;
    targetX.set(next.x);
    targetY.set(next.y);
    if (snap || reduced) {
      springX.jump(next.x);
      springY.jump(next.y);
    }
    if (active.current !== id) {
      active.current = id;
      // Give each opening its own layer, including a return to a still-exiting row.
      setSelection((current) => ({ id, revision: current.revision + 1 }));
    }
  }

  function focusProject(id: string, element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    follow(id, bounds.left + bounds.width * 0.68, bounds.top + bounds.height / 2, true);
  }

  for (const { image } of projects) {
    if (image) preload(image, { as: "image" });
  }

  const preview = inline ? undefined : projects.find(({ id }) => id === hovered);
  const rowTransition = reduced ? { duration: 0 } : settings.row;

  return (
    <>
      <ol
        ref={list}
        className="project-list"
        role="list"
        onPointerLeave={hide}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            hide();
            setOpen(null);
          }
        }}
      >
        {projects.map((project) => {
          const { id, number, title, category, href } = project;
          const expanded = inline && open === id;
          const selected = !inline && hovered === id;
          const opacity = !inline && hovered && !selected ? settings.inactiveOpacity : 1;
          const previewId = uid + id;
          const row = (
            <>
              <motion.span className="project-number" aria-hidden="true" animate={{ opacity }} transition={rowTransition}>{number}</motion.span>
              <motion.span className="project-title" style={{ textDecorationLine: "none" }} animate={{ opacity, x: selected && !reduced ? settings.shift : 0 }} transition={rowTransition}>{title}</motion.span>
              <motion.span className="project-category" animate={{ opacity }} transition={rowTransition}>{category}</motion.span>
            </>
          );
          const events = {
            onFocus: (event: React.FocusEvent<HTMLElement>) => {
              if (!inline && event.currentTarget.matches(":focus-visible")) focusProject(id, event.currentTarget);
            },
            onBlur: hide,
          };

          return (
            <li
              key={id}
              id={isProjectId(id) ? projectRegistry[id].elementId : undefined}
              onPointerMove={(event) => {
                if (!inline && event.pointerType !== "touch") follow(id, event.clientX, event.clientY);
              }}
              onPointerEnter={(event) => {
                if (!inline && event.pointerType !== "touch") follow(id, event.clientX, event.clientY);
              }}
            >
              {!inline && href ? (
                <a className="project-row" data-carrot-anchor href={href} {...events}>{row}</a>
              ) : (
                <button
                  type="button"
                  className="project-row"
                  data-carrot-anchor
                  style={rowButtonStyle}
                  aria-expanded={inline ? expanded : selected}
                  aria-controls={expanded ? previewId : undefined}
                  onClick={(event) => {
                    if (inline) setOpen((current) => current === id ? null : id);
                    else if (event.detail === 0) {
                      if (active.current === id) hide();
                      else focusProject(id, event.currentTarget);
                    }
                  }}
                  {...events}
                >
                  {row}
                </button>
              )}
              <AnimatePresence initial={false}>
                {expanded && <InlinePreview id={previewId} project={project} viewProject={viewProject} reduced={reduced} />}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
      {size && createPortal(
        <motion.div
          className="project-floating-preview"
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 19,
            pointerEvents: "none",
            x,
            y,
            width: size.width,
            height: size.height,
          }}
        >
          <AnimatePresence mode="sync">
            {preview && (
              <motion.div
                key={revision}
                className="project-preview-media project-floating-media"
                style={{
                  ...previewMediaStyle,
                  position: "absolute",
                  inset: 0,
                  boxShadow: "0 14px 36px rgba(0,0,0,0.16)",
                  transformOrigin: `${settings.origin.x * 100}% ${settings.origin.y * 100}%`,
                }}
                initial={{ opacity: 0, scale: reduced ? 1 : 0.95, rotate: reduced ? 0 : settings.tilt - 4, y: reduced ? 0 : 14 }}
                animate={{ opacity: 1, scale: 1, rotate: reduced ? 0 : settings.tilt, y: 0 }}
                exit={{ opacity: 0, scale: reduced ? 1 : 0.96, rotate: reduced ? 0 : settings.tilt + 2, y: reduced ? 0 : 8 }}
                transition={reduced ? { duration: 0.1 } : settings.preview}
              >
                <PreviewContent project={preview} decorative />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>,
        document.body,
      )}
    </>
  );
}
