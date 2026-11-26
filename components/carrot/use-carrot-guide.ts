import { useMotionValue, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { projectRegistry, type ProjectId } from "@/lib/carrot/project-links";

type Point = { x: number; feet: number };
type Guide = { project: ProjectId; phase: "travel" | "parked" };

function textBounds(element: Element | null) {
  if (!element) return [];
  const range = document.createRange();
  range.selectNodeContents(element);
  return Array.from(range.getClientRects());
}

function landing(anchor: HTMLElement, size: number): Point {
  const row = anchor.getBoundingClientRect();
  const title = textBounds(anchor.querySelector(".project-title"));
  const category = textBounds(anchor.querySelector(".project-category"));
  const textRight = Math.max(row.left, ...title.map((rect) => rect.right));
  const stacked = category.some((rect) => rect.top >= (title.at(-1)?.bottom ?? row.top));
  const rightEdge = stacked ? row.right : Math.min(row.right, ...category.map((rect) => rect.left));
  const half = size / 2;
  const center = rightEdge - half - 8;
  const gap = center - half - textRight;
  const blocked = stacked && category.some((rect) => rect.right > center - half);
  const feet = gap >= 12 && !blocked
    ? (row.top + row.bottom) / 2 + size * .28
    : row.bottom + size * .22;
  const x = (gap >= 12 && !blocked ? center : row.right - half - 6) - half;
  return { x: Math.max(0, Math.min(x, document.documentElement.clientWidth - size)), feet };
}

export function useCarrotGuide(
  bunny: RefObject<HTMLButtonElement | null>, x: MotionValue<number>, reduced: boolean,
) {
  const y = useMotionValue(0);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [facingRight, setFacingRight] = useState(true);
  const cancel = useRef<(() => void) | null>(null);

  useEffect(() => () => cancel.current?.(), []);

  function guideTo(project: ProjectId): boolean {
    const row = document.getElementById(projectRegistry[project].elementId);
    const anchor = row?.querySelector<HTMLElement>("[data-carrot-anchor]");
    const button = bunny.current;
    if (!row || !anchor || !button) return false;

    cancel.current?.();
    const origin = { x: x.get(), feet: button.getBoundingClientRect().bottom };
    setGuide({ project, phase: "travel" });
    anchor.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center", inline: "nearest" });

    let frame = 0;
    let highlightTimer = 0;
    let start: number | undefined;
    let duration = 0;
    let hops = 0;
    let observer: ResizeObserver | undefined;

    function position(point: Point) {
      if (!button) return;
      x.set(point.x);
      const ground = document.documentElement.clientHeight - (parseFloat(getComputedStyle(button).marginBottom) || 0);
      y.set(point.feet - ground);
    }

    function track() {
      if (anchor && button) position(landing(anchor, button.offsetWidth));
    }

    function travel(now: number) {
      if (!anchor || !button || !row) return;
      const size = button.offsetWidth;
      const target = landing(anchor, size);
      if (start === undefined) {
        start = now;
        const distance = Math.hypot(target.x - origin.x, target.feet - origin.feet);
        hops = Math.max(2, Math.min(5, Math.ceil(distance / 120)));
        duration = reduced ? 0 : 350 + hops * 165;
        if (Math.abs(target.x - origin.x) > 2) setFacingRight(target.x > origin.x);
      }

      const progress = duration ? Math.min(1, (now - start) / duration) : 1;
      if (progress < 1) {
        const pace = progress * progress * (3 - 2 * progress);
        const step = progress * (hops + 1);
        const arc = Math.sin(Math.PI * (step % 1)) * (step < hops ? 10 : 3);
        const feet = origin.feet + (target.feet - origin.feet) * pace - arc;
        position({
          x: origin.x + (target.x - origin.x) * pace,
          feet: Math.max(size, Math.min(document.documentElement.clientHeight, feet)),
        });
        frame = requestAnimationFrame(travel);
        return;
      }

      track();
      setGuide({ project, phase: "parked" });
      row.dataset.carrotHighlight = "true";
      highlightTimer = window.setTimeout(() => delete row.dataset.carrotHighlight, 3000);
      window.addEventListener("scroll", track, { passive: true });
      window.addEventListener("resize", track);
      observer = new ResizeObserver(track);
      observer.observe(anchor);
      observer.observe(button);
      observer.observe(document.documentElement);
    }

    frame = requestAnimationFrame(travel);
    cancel.current = () => {
      cancelAnimationFrame(frame);
      clearTimeout(highlightTimer);
      delete row.dataset.carrotHighlight;
      observer?.disconnect();
      window.removeEventListener("scroll", track);
      window.removeEventListener("resize", track);
    };
    return true;
  }

  function resetGuide() {
    if (!cancel.current) return;
    cancel.current();
    cancel.current = null;
    setGuide(null);
    y.set(0);
    x.set(0);
  }

  return { guide, guideTo, resetGuide, facingRight, y };
}
