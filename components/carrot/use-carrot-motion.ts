"use client";

import { type MotionValue } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { sprites, spritePath } from "./sprites";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function destination(current: number, min: number, max: number, mobile: boolean, facingRight: boolean) {
  const roll = Math.random();
  const [low, high] = mobile
    ? roll < 0.45 ? [30, 75] : roll < 0.85 ? [70, 140] : [130, 220]
    : roll < 0.4 ? [55, 120] : roll < 0.82 ? [110, 240] : [220, 420];
  const span = max - min;
  const distance = Math.min(low, span) + Math.random() * (Math.min(high, span) - Math.min(low, span));
  const direction = (facingRight ? 1 : -1) * (Math.random() < 0.18 ? -1 : 1);
  const candidate = current + direction * distance;
  const target = clamp(candidate < min || candidate > max ? current - direction * distance : candidate, min, max);

  if (Math.abs(target - current) >= 20) return target;
  const fallback = Math.min(mobile ? 55 : 90, span);
  return clamp(current + (current < (min + max) / 2 ? fallback : -fallback), min, max);
}

export function useCarrotMotion(
  open: boolean, bunny: RefObject<HTMLButtonElement | null>, x: MotionValue<number>,
  reduced: boolean, guide: "travel" | "parked" | undefined,
) {
  const [entered, setEntered] = useState(false);
  const [hopping, setHopping] = useState(false);
  const [facingRight, setFacingRight] = useState(true);
  const [frame, setFrame] = useState(0);
  const [nearRight, setNearRight] = useState(false);
  const firstHop = useRef(true);
  const pendingHop = useRef<(() => void) | null>(null);
  const direction = useRef(true);
  const viewport = useRef({ min: 0, max: 0, mobile: false });
  const mode = guide === "travel"
    ? reduced ? "idle" : "hopping"
    : open ? "laptop" : hopping && !reduced ? "hopping" : "idle";

  useEffect(() => {
    const images = Object.values(sprites).flat().map((frame) => {
      const image = new window.Image();
      image.src = spritePath(frame);
      return image;
    });
    const entrance = window.setTimeout(() => setEntered(true), reduced ? 0 : 1600);
    return () => {
      window.clearTimeout(entrance);
      images.length = 0;
    };
  }, [reduced]);

  useLayoutEffect(() => {
    const button = bunny.current;
    if (!entered || !button) return;

    function measure(size: number) {
      const width = document.documentElement.clientWidth;
      const mobile = width < 600;
      const padding = Math.min(mobile ? 6 : 10, (width - size) / 2);
      viewport.current = { min: padding, max: width - size - padding, mobile };
      x.set(clamp(x.get(), viewport.current.min, viewport.current.max));
      setNearRight(x.get() > width - 225);
    }
    const measurePosition = () => measure(button.getBoundingClientRect().width);
    measurePosition();
    const observer = new ResizeObserver(measurePosition);
    observer.observe(document.documentElement);
    observer.observe(button);
    const unbind = x.on("change", (position) => setNearRight(position > document.documentElement.clientWidth - 225));
    return () => {
      observer.disconnect();
      unbind();
    };
  }, [bunny, entered, x]);

  useEffect(() => {
    if (!entered || open || reduced || guide) return;
    let delay = 0;
    let animation = 0;

    function schedule(wait: number) {
      delay = window.setTimeout(hop, wait);
    }

    function hop() {
      const { min, max, mobile } = viewport.current;
      const current = x.get();
      const initial = firstHop.current;
      firstHop.current = false;
      const target = initial
        ? Math.min(max, current + (mobile ? 90 : 160))
        : destination(current, min, max, mobile, direction.current);
      if (Math.abs(target - current) < 1) {
        schedule(900);
        return;
      }
      direction.current = target > current;
      setFacingRight(direction.current);
      setFrame(0);
      setHopping(true);
      let previousTime: number | undefined;

      function move(now: number) {
        const bounded = clamp(target, viewport.current.min, viewport.current.max);
        const distance = bounded - x.get();
        const step = Math.min(now - (previousTime ?? now), 32) * 0.042;
        previousTime = now;

        if (Math.abs(distance) <= Math.max(step, 1)) {
          x.set(bounded);
          setFrame(0);
          setHopping(false);
          const pause = (Math.random() < 0.75 ? 600 : 950) + Math.random() * 350;
          schedule(pause);
          return;
        }
        x.set(clamp(x.get() + Math.sign(distance) * step, viewport.current.min, viewport.current.max));
        animation = requestAnimationFrame(move);
      }
      animation = requestAnimationFrame(move);
    }

    schedule(900);
    function cancel() {
      window.clearTimeout(delay);
      cancelAnimationFrame(animation);
    }
    pendingHop.current = cancel;
    return () => {
      cancel();
      pendingHop.current = null;
    };
  }, [entered, open, reduced, x, guide]);

  useEffect(() => {
    if (!entered || reduced) return;
    const frames = sprites[mode];
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % frames.length;
      setFrame(index);
    }, mode === "hopping" ? 70 : 450);
    return () => window.clearInterval(timer);
  }, [entered, mode, reduced]);

  function stopHop() {
    pendingHop.current?.();
    setHopping(false);
    setFrame(0);
  }

  return {
    x, entered, facingRight, nearRight, mode, reduced, stopHop,
    frame: spritePath(sprites[mode][reduced ? 0 : frame % sprites[mode].length]),
  };
}
