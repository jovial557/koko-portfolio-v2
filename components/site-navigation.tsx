"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { resumeUrl } from "@/lib/carrot/project-links";
import type { Locale } from "@/i18n/routing";
import { ScrambleText } from "./scramble-text";

type Labels = Record<
  "primary" | "home" | "menu" | "play" | "about" | "resume" | "theme" | "newYork" | "tokyo",
  string
>;

const originalSite = "https://konatsukoko.com";

const timezones = [
  { city: "newYork", timeZone: "America/New_York" },
  { city: "tokyo", timeZone: "Asia/Tokyo" },
] as const;
const clockFormat = { hour: "numeric", minute: "2-digit" } as const;
const holdTime = 4000;
const rollTime = 1200;
const rollEase = [0.65, 0, 0.35, 1] as const;

function ClockLine({ children, reduced }: { children: string; reduced: boolean }) {
  const present = useIsPresent();

  return (
    <motion.span
      aria-hidden={!present}
      style={{ position: "absolute", inset: 0 }}
      initial={{ y: reduced ? 0 : "100%" }}
      animate={{ y: 0 }}
      exit={{ y: reduced ? 0 : "-100%" }}
      transition={{ duration: reduced ? 0 : rollTime / 1000, ease: rollEase }}
    >
      {children}
    </motion.span>
  );
}

function SiteClock({ locale, labels }: { locale: Locale; labels: Labels }) {
  const [timestamp, setTimestamp] = useState<number>();
  const [active, setActive] = useState(0);
  const reduced = Boolean(useReducedMotion());

  const formatters = useMemo(
    () => timezones.map(({ timeZone }) => new Intl.DateTimeFormat(locale, { ...clockFormat, timeZone })),
    [locale],
  );
  // Reserve room for both cities and the widest morning or afternoon time.
  const sampleTimes = useMemo(() => {
    const utc = new Intl.DateTimeFormat(locale, { ...clockFormat, timeZone: "UTC" });
    return [utc.format(0), utc.format(12 * 3_600_000)];
  }, [locale]);

  useEffect(() => {
    const update = () => setTimestamp(Date.now());
    const timer = window.setInterval(update, 1000);
    update();
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let timer: number;
    function advance() {
      setActive((current) => (current + 1) % timezones.length);
      timer = window.setTimeout(advance, holdTime + (reduced ? 0 : rollTime));
    }
    timer = window.setTimeout(advance, holdTime);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  const zone = timezones[active];
  const time = timestamp === undefined ? "" : formatters[active].format(timestamp);

  return (
    <span className="site-clock" style={{ position: "relative", display: "grid", overflow: "hidden" }}>
      {timezones.flatMap(({ city }) =>
        sampleTimes.map((sample) => (
          <span key={`${city}-${sample}`} aria-hidden="true" style={{ gridArea: "1 / 1", visibility: "hidden" }}>
            {labels[city]} {sample}
          </span>
        )),
      )}
      <AnimatePresence initial={false} mode="sync">
        <ClockLine key={zone.timeZone} reduced={reduced}>
          {`${labels[zone.city]} ${time}`}
        </ClockLine>
      </AnimatePresence>
    </span>
  );
}

function toggleTheme() {
  const root = document.documentElement;
  const current = getComputedStyle(root).colorScheme;
  const theme = current === "dark" ? "light" : "dark";
  root.dataset.theme = theme;

  try {
    localStorage.setItem("koko-theme", theme);
  } catch {
    // The current page can still change theme when storage is unavailable.
  }
}

export function SiteNavigation({ locale, labels }: { locale: Locale; labels: Labels }) {
  return (
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label={labels.home}>KOKONA</Link>
      <SiteClock locale={locale} labels={labels} />
      <div className="header-actions">
        <details
          className="mobile-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape" && event.currentTarget.open) {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary>{labels.menu}</summary>
          <NavigationLinks labels={labels} />
        </details>
        <div className="desktop-menu">
          <NavigationLinks labels={labels} />
        </div>
        <button className="theme-button" type="button" onClick={toggleTheme} aria-label={labels.theme}>
          <span aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function NavigationLinks({ labels }: { labels: Labels }) {
  return (
    <nav className="site-nav" aria-label={labels.primary}>
      <ScrambleText label={labels.play} href={`${originalSite}/play`} />
      <ScrambleText label={labels.about} href={`${originalSite}/about`} />
      <ScrambleText label={labels.resume} href={resumeUrl} />
    </nav>
  );
}
