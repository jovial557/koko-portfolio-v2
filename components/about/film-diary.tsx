"use client"

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
    motion,
    animate,
    useMotionValue,
    useTransform,
    useMotionValueEvent,
    type MotionValue,
} from "motion/react"

type Photo = {
    image?: string | { src?: string }
    caption?: string
    date?: string
    month?: string
    year?: string
}
type Props = {
    style?: React.CSSProperties
    photos?: Photo[]
    foreground?: string
    showGrain?: boolean
    showFilmstrip?: boolean
    cornerRadius?: number
    autoPlay?: boolean
    interval?: number
    scrollDriven?: boolean
}
const imageDirectory = "/images/about/film-diary/"
const defaults: Photo[] = [
    { image: imageDirectory + "01-first-ai-hackathon.jpg", caption: "My First AI Hackathon", month: "October", year: "2025" },
    { image: imageDirectory + "02-figmake.jpg", caption: "Fig-Make @FIT!", month: "January", year: "2026" },
    { image: imageDirectory + "03-ai-hackathon.jpg", caption: "AI Hackathon Pt. 2", month: "April", year: "2026" },
    { image: imageDirectory + "04-portfolio-review.jpg", caption: "Portfolio Review Night Volunteer", month: "April", year: "2026" },
    { image: imageDirectory + "05-figma-campus-leader.png", caption: "Figma Campus Leader debut!", month: "October", year: "2026" },
]
const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
]
const src = (v: Photo["image"]) => (typeof v === "string" ? v : v?.src || "")
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
function photoDate(p: Photo): number {
    if (p.date && /^\d{4}-\d\d-\d\d/.test(p.date))
        return (
            Number(p.date.slice(0, 4)) * 10000 +
            Number(p.date.slice(5, 7)) * 100 +
            Number(p.date.slice(8, 10))
        )
    const y = Number(p.year) || 2026
    const m = months.indexOf(String(p.month || "").toLowerCase())
    return y * 10000 + (m < 0 ? 1 : m + 1) * 100 + 1
}

const slots = [
    { at: -3, x: -0.17, w: 0.14, h: 0.34, o: 1 },
    { at: -2, x: 0.045, w: 0.18, h: 0.49, o: 1 },
    { at: -1, x: 0.235, w: 0.255, h: 0.66, o: 1 },
    { at: 0, x: 0.5, w: 0.435, h: 0.84, o: 1 },
    { at: 1, x: 0.765, w: 0.255, h: 0.66, o: 1 },
    { at: 2, x: 0.952, w: 0.18, h: 0.49, o: 1 },
    { at: 3, x: 1.165, w: 0.14, h: 0.34, o: 1 },
]
function slot(t: number) {
    const v = clamp(t, -3, 3)
    let j = 0
    while (j < slots.length - 2 && v > slots[j + 1].at) j++
    const a = slots[j],
        b = slots[j + 1],
        f = clamp((v - a.at) / (b.at - a.at), 0, 1)
    const mix = (k: "x" | "w" | "h" | "o") => a[k] + (b[k] - a[k]) * f
    return { x: mix("x"), w: mix("w"), h: mix("h"), o: mix("o") }
}
// Every card subscribes directly to the same continuous MotionValue. No React
// render and no spring restart is needed for every pointermove.
function FilmCard({
    photo,
    index,
    progress,
    width,
    stageHeight,
    ratio,
    radius,
    grain,
    onMeasured,
    onChoose,
}: {
    photo: Photo
    index: number
    progress: MotionValue<number>
    width: number
    stageHeight: number
    ratio: number
    radius: number
    grain: boolean
    onMeasured: (source: string, ratio: number) => void
    onChoose: (index: number) => void
}) {
    const calc = (v: number) => {
        const s = slot(index - v)
        const maxW = s.w * width,
            maxH = s.h * stageHeight
        const w = Math.min(maxW, maxH * clamp(ratio, 0.52, 2.2))
        const h = w / clamp(ratio, 0.52, 2.2)
        return {
            left: s.x * width - w / 2,
            top: (stageHeight - h) / 2,
            w,
            h,
            opacity: s.o,
        }
    }
    const left = useTransform(progress, (v) => calc(v).left)
    const top = useTransform(progress, (v) => calc(v).top)
    const cardWidth = useTransform(progress, (v) => calc(v).w)
    const cardHeight = useTransform(progress, (v) => calc(v).h)
    // Softly recede as each photograph moves away from the selected center.
    // The center image is always at full opacity and sharp.
    const opacity = useTransform(progress, (v) => {
        const d = Math.abs(index - v)
        return d <= 0.12
            ? 1
            : d < 1
              ? 1 - ((d - 0.12) * 0.48) / 0.88
              : d < 2
                ? 0.52 - (d - 1) * 0.22
                : Math.max(0.12, 0.3 - (d - 2) * 0.09)
    })
    const blur = useTransform(progress, (v) => {
        const d = Math.abs(index - v)
        return `blur(${Math.max(0, Math.min(3.8, (d - 0.32) * 1.45)).toFixed(2)}px)`
    })
    const zIndex = useTransform(
        progress,
        (v) => 1000 - Math.round(Math.abs(index - v) * 100)
    )
    return (
        <motion.div
            onClick={(e) => {
                e.stopPropagation()
                onChoose(index)
            }}
            style={{
                position: "absolute",
                left,
                top,
                width: cardWidth,
                height: cardHeight,
                opacity,
                filter: blur,
                zIndex,
                borderRadius: radius,
                overflow: "hidden",
                cursor: "grab",
                willChange: "left,top,width,height,opacity",
            }}
        >
            <Image
                src={src(photo.image)}
                fill
                unoptimized
                loading="eager"
                alt={photo.caption || "Film photo"}
                draggable={false}
                onLoad={(e) => {
                    const el = e.currentTarget
                    const natural =
                        el.naturalWidth / Math.max(1, el.naturalHeight)
                    onMeasured(src(photo.image), natural)
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: "contain",
                    pointerEvents: "none",
                    filter: grain ? "saturate(.87) contrast(.98)" : "none",
                }}
            />
        </motion.div>
    )
}
function TimelineTick({
    index,
    progress,
    ticksPerPhoto,
    spacing,
    color,
}: {
    index: number
    progress: MotionValue<number>
    ticksPerPhoto: number
    spacing: number
    color: string
}) {
    const height = useTransform(progress, (v) => {
        const distance = Math.abs(index - v * ticksPerPhoto)
        const detail = (index % 7) * 0.95 + (index % 3) * 1.3
        return 37 + detail + 18 * Math.exp(-distance / 5.5)
    })
    return (
        <motion.span
            aria-hidden
            style={{
                position: "absolute",
                left: index * spacing,
                bottom: 7,
                width: 1.6,
                height,
                opacity: 0.16,
                background: color,
                transform: "translateX(-50%)",
                willChange: "height",
                pointerEvents: "none",
            }}
        />
    )
}
export default function FilmDiary(props: Props) {
    const {
        style,
        photos = defaults,
        foreground = "var(--text)",
        showGrain = false,
        showFilmstrip = true,
        cornerRadius = 3,
        autoPlay = false,
        interval = 4500,
        scrollDriven = false,
    } = props
    const data = useMemo(() => {
        const arr = (Array.isArray(photos) ? photos : []).filter(
            (p) => !!src(p.image)
        )
        return (arr.length ? arr : defaults)
            .map((p, j) => ({ ...p, _order: j }))
            .sort((a, b) => photoDate(a) - photoDate(b) || a._order - b._order)
    }, [photos])
    const count = data.length
    const progress = useMotionValue(0)
    const [active, setActive] = useState(0)
    const [dimensions, setDimensions] = useState({ width: 1280, height: 800 })
    const [ratios, setRatios] = useState<Record<string, number>>({})
    const [dragging, setDragging] = useState(false)
    const root = useRef<HTMLDivElement>(null)
    const displayRef = useRef<HTMLDivElement>(null)
    const animation = useRef<{ stop: () => void } | null>(null)
    const drag = useRef<{
        id: number
        x: number
        initial: number
        last: number
        lastT: number
        velocity: number
        kind: "photos" | "timeline"
        moved: boolean
    } | null>(null)
    const blockClick = useRef(false)
    const width = dimensions.width
    const compact = width < 620
    const visualHeight = Math.max(
        170,
        dimensions.height * (compact ? 0.52 : 0.58)
    )
    const tickSpacing = Math.max(7, Math.min(13, width / 95))
    const ticksPerPhoto = 32
    const timelineStep = tickSpacing * ticksPerPhoto
    const photoStep = Math.max(130, width * 0.285)
    // Keep the center playhead aligned with a whole timeline tick.
    // Photo movement remains continuous; only the tick rail advances in discrete steps.
    const tickX = useTransform(
        progress,
        (v) => -Math.round(v * ticksPerPhoto) * tickSpacing
    )
    const selected = data[active] || data[0]
    const onMeasured = React.useCallback((url: string, ratio: number) => {
        setRatios((prev) =>
            Math.abs((prev[url] || 0) - ratio) < 0.015
                ? prev
                : { ...prev, [url]: ratio }
        )
    }, [])
    useMotionValueEvent(progress, "change", (value) => {
        const idx = clamp(Math.round(value), 0, count - 1)
        setActive((previous) => (previous === idx ? previous : idx))
    })
    useEffect(() => {
        if (!displayRef.current || typeof ResizeObserver === "undefined") return
        const observer = new ResizeObserver((entries) => {
            const r = entries[0]?.contentRect
            if (r)
                setDimensions((previous) =>
                    Math.abs(previous.width - r.width) < 0.5 &&
                    Math.abs(previous.height - r.height) < 0.5
                        ? previous
                        : { width: r.width, height: r.height }
                )
        })
        observer.observe(displayRef.current)
        return () => observer.disconnect()
    }, [])
    useEffect(() => {
        if (progress.get() > count - 1) progress.set(count - 1)
    }, [count, progress])
    useEffect(() => {
        if (!scrollDriven || typeof window === "undefined") return
        let frame = 0
        const update = () => {
            frame = 0
            if (!root.current || drag.current) return
            const rect = root.current.getBoundingClientRect()
            const available = Math.max(1, rect.height - window.innerHeight)
            const fraction = clamp(-rect.top / available, 0, 1)
            animation.current?.stop()
            progress.set(fraction * Math.max(0, count - 1))
        }
        const request = () => {
            if (!frame) frame = window.requestAnimationFrame(update)
        }
        request()
        window.addEventListener("scroll", request, { passive: true })
        window.addEventListener("resize", request)
        return () => {
            window.removeEventListener("scroll", request)
            window.removeEventListener("resize", request)
            if (frame) window.cancelAnimationFrame(frame)
        }
    }, [scrollDriven, count, progress])
    useEffect(
        () => () => {
            animation.current?.stop()
        },
        []
    )
    const glide = React.useCallback((target: number) => {
        animation.current?.stop()
        animation.current = animate(progress, clamp(target, 0, count - 1), {
            type: "spring",
            stiffness: 125,
            damping: 25,
            mass: 1.05,
            restDelta: 0.002,
            restSpeed: 0.002,
        })
    }, [count, progress])
    useEffect(() => {
        if (scrollDriven || !autoPlay || dragging || count < 2) return
        const timer = setInterval(
            () => {
                const n = Math.round(progress.get())
                glide(n >= count - 1 ? 0 : n + 1)
            },
            Math.max(1800, interval)
        )
        return () => clearInterval(timer)
    }, [autoPlay, interval, dragging, count, scrollDriven, glide, progress])
    const start = (
        e: React.PointerEvent<HTMLDivElement>,
        kind: "photos" | "timeline"
    ) => {
        if (e.pointerType === "mouse" && e.button !== 0) return
        animation.current?.stop()
        blockClick.current = false
        drag.current = {
            id: e.pointerId,
            x: e.clientX,
            initial: progress.get(),
            last: e.clientX,
            lastT: performance.now(),
            velocity: 0,
            kind,
            moved: false,
        }
        setDragging(true)
        if (e.target instanceof Element) e.target.setPointerCapture(e.pointerId)
    }
    const move = (e: React.PointerEvent<HTMLDivElement>) => {
        const g = drag.current
        if (!g || g.id !== e.pointerId) return
        const dx = e.clientX - g.x
        if (Math.abs(dx) > 4) {
            g.moved = true
            blockClick.current = true
        }
        const now = performance.now()
        const dt = Math.max(1, now - g.lastT)
        g.velocity = g.velocity * 0.55 + ((e.clientX - g.last) / dt) * 0.45
        g.last = e.clientX
        g.lastT = now
        // Directly update the motion value; no react reconciliation during drag.
        progress.set(
            clamp(
                g.initial -
                    dx / (g.kind === "photos" ? photoStep : timelineStep),
                0,
                count - 1
            )
        )
    }
    const finish = (e: React.PointerEvent<HTMLDivElement>) => {
        const g = drag.current
        if (!g || g.id !== e.pointerId) return
        const distance = e.clientX - g.x
        if (g.moved) {
            const unit = g.kind === "photos" ? photoStep : timelineStep
            const projected = distance + clamp(g.velocity * 165, -200, 200)
            const next = clamp(g.initial - projected / unit, 0, count - 1)
            glide(Math.round(next))
        } else if (g.kind === "timeline") {
            const r = e.currentTarget.getBoundingClientRect()
            glide(
                Math.round(
                    progress.get() +
                        (r.left + r.width / 2 - e.clientX) / timelineStep
                )
            )
        }
        drag.current = null
        setDragging(false)
        if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const keyboard = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") {
            e.preventDefault()
            glide(Math.round(progress.get()) - 1)
        }
        if (e.key === "ArrowRight") {
            e.preventDefault()
            glide(Math.round(progress.get()) + 1)
        }
        if (e.key === "Home") {
            e.preventDefault()
            glide(0)
        }
        if (e.key === "End") {
            e.preventDefault()
            glide(count - 1)
        }
    }
    const choose = (i: number) => {
        if (!blockClick.current) glide(i)
    }
    const fullDate = selected?.date && /^\d{4}-\d{2}/.test(selected.date)
        ? selected.date
        : undefined
    const month = fullDate
        ? new Date(fullDate + "T12:00:00").toLocaleDateString("en-US", {
              month: "long",
          })
        : selected?.month || "June"
    const year = fullDate
        ? fullDate.slice(0, 4)
        : selected?.year || selected?.date?.slice(0, 4) || "2026"
    const begin = Math.max(0, active - 4),
        end = Math.min(count, active + 5)
    const gallery = (
        <div
            ref={displayRef}
            tabIndex={0}
            onKeyDown={keyboard}
            aria-label={
                scrollDriven
                    ? "Scroll to explore photographs"
                    : "Draggable chronological photo gallery"
            }
            style={{
                width: "100%",
                height: scrollDriven ? "min(720px,88vh)" : "100%",
                position: "relative",
                overflow: "hidden",
                background: "transparent",
                color: foreground,
                fontFamily: "var(--font-film-diary, Inter), Arial, sans-serif",
                userSelect: "none",
                outlineOffset: -3,
            }}
        >
            <div
                onPointerDown={(e) => start(e, "photos")}
                onPointerMove={move}
                onPointerUp={finish}
                onPointerCancel={finish}
                aria-label="Drag photos horizontally"
                style={{
                    height: visualHeight,
                    width: "100%",
                    overflow: "hidden",
                    position: "relative",
                    touchAction: "pan-y",
                    cursor: dragging ? "grabbing" : "grab",
                    maskImage:
                        "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
                    WebkitMaskImage:
                        "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
                }}
            >
                {data.slice(begin, end).map((photo, idx) => {
                    const index = begin + idx
                    return (
                        <FilmCard
                            key={src(photo.image) + "-" + index}
                            photo={photo}
                            index={index}
                            progress={progress}
                            width={width}
                            stageHeight={visualHeight}
                            ratio={ratios[src(photo.image)] || 1.42}
                            radius={cornerRadius}
                            grain={showGrain}
                            onMeasured={onMeasured}
                            onChoose={choose}
                        />
                    )
                })}
            </div>
            <div
                aria-live="polite"
                style={{
                    height: compact ? 45 : 56,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: compact ? 15 : 20,
                    letterSpacing: "-.02em",
                    fontWeight: 500,
                    textAlign: "center",
                }}
            >
                {selected?.caption || "untitled"}
            </div>
            {showFilmstrip && (
                <div
                    role="slider"
                    tabIndex={0}
                    aria-label="Continuous draggable photo timeline"
                    aria-valuemin={1}
                    aria-valuemax={count}
                    aria-valuenow={active + 1}
                    aria-valuetext={selected?.caption}
                    onKeyDown={keyboard}
                    onPointerDown={(e) => start(e, "timeline")}
                    onPointerMove={move}
                    onPointerUp={finish}
                    onPointerCancel={finish}
                    style={{
                        position: "relative",
                        height: compact ? 69 : 78,
                        overflow: "hidden",
                        width: "100%",
                        touchAction: "pan-y",
                        cursor: dragging ? "grabbing" : "grab",
                    }}
                >
                    <div
                        aria-hidden
                        style={{
                            position: "absolute",
                            inset: 0,
                            overflow: "hidden",
                            pointerEvents: "none",
                            maskImage:
                                "linear-gradient(to right,transparent 12%,black 37%,black 65%,transparent 90%)",
                            WebkitMaskImage:
                                "linear-gradient(to right,transparent 12%,black 37%,black 65%,transparent 90%)",
                        }}
                    >
                        <motion.div
                            style={{
                                position: "absolute",
                                left: "50%",
                                top: 0,
                                width: 0,
                                height: "100%",
                                x: tickX,
                                willChange: "transform",
                            }}
                        >
                            {Array.from(
                                { length: (count - 1) * ticksPerPhoto + 1 },
                                (_, k) => (
                                    <TimelineTick
                                        key={k}
                                        index={k}
                                        progress={progress}
                                        ticksPerPhoto={ticksPerPhoto}
                                        spacing={tickSpacing}
                                        color={foreground}
                                    />
                                )
                            )}
                        </motion.div>
                    </div>
                    <div
                        aria-hidden
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: 0,
                            width: 2,
                            height: 71,
                            transform: "translateX(-50%)",
                            background: foreground,
                            pointerEvents: "none",
                        }}
                    />
                </div>
            )}
            <div
                aria-live="polite"
                style={{
                    textAlign: "center",
                    lineHeight: 1.4,
                    paddingTop: 2,
                    letterSpacing: "-.015em",
                    fontSize: compact ? 16 : 20,
                }}
            >
                <div style={{ opacity: 0.7 }}>{month}</div>
                <div style={{ opacity: 0.43 }}>{year}</div>
            </div>
        </div>
    )
    return (
        <div
            ref={root}
            style={{
                ...style,
                width: "100%",
                height: "100%",
                position: "relative",
                background: "transparent",
                overflow: scrollDriven ? "visible" : "hidden",
            }}
        >
            {scrollDriven ? (
                <div
                    style={{
                        position: "sticky",
                        top: 0,
                        width: "100%",
                        height: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <div style={{ width: "100%", height: "min(720px,88vh)" }}>
                        {gallery}
                    </div>
                </div>
            ) : (
                gallery
            )}
        </div>
    )
}
