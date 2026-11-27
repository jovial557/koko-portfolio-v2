"use client"

// Texts Cloud — words on a Fibonacci sphere rotating around a fixed tilted axis.
// Performance pass: one rAF loop that only runs while something moves (and pauses off-screen,
// and in hidden tabs), frame-rate independent motion,
// cached style writes, typography set once on the list instead of on every word,
// no per-instance <style> tag. Drag: smoothed follow + velocity-based inertia that
// decays back into the auto-spin.

import * as React from "react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

export interface TextsCloudProps {
    words: readonly string[]
    bgColor: string
    textColor: string
    speed: number // auto-spin speed, radians per frame at 60 fps (frame-rate independent)
    fontScale: number // font size relative to container
    letterSpacingEm: number // global letter-spacing in em
    wordSpacing: number // spacing multiplier between words
    dragToScrub: boolean // enable scrubbing by dragging
    scrubSensitivity: number // radians per px when dragging
    smoothing: number // 0..1, how softly the cloud follows the pointer
    inertia: number // 0..1, how long the cloud keeps spinning after release
}

type CloudEngine = {
    render: (force: boolean) => void
    wake: () => void
}

/* ======================= Constants ======================= */

const DEFAULT_WORDS = [
    "Product Design",
    "Art Direction",
    "Figma",
    "FLORA",
    "Creative Technology",
    "Codex",
    "Claude",
    "UX Research",
    "Interaction Design",
    "ElevenLabs",
    "Figma Weave",
    "Jitter",
    "Adobe Creative Suite",
    "Vercel",
] as const

const ROTATION_AXIS = normalize([0.6, 1, 0.2])
const AXIS_X = ROTATION_AXIS[0]
const AXIS_Y = ROTATION_AXIS[1]
const AXIS_Z = ROTATION_AXIS[2]

// "speed" was historically radians per frame; 60 fps keeps the same visual speed on every display.
const REFERENCE_FPS = 60
const MAX_DELTA_SECONDS = 0.05
const MAX_SMOOTHING_SECONDS = 0.2
const MIN_INERTIA_SECONDS = 0.05
const MAX_INERTIA_SECONDS = 2
const MAX_FLING_VELOCITY = 25 // rad/s
const VELOCITY_WINDOW_MS = 100
const HOLD_RESET_MS = 80 // pointer held still this long before release → no fling
const VELOCITY_SAMPLES = 8
// The loop stops once motion is below what the eye (or the 0.01 px rounding) can see.
const SETTLE_PIXELS = 0.02
const SETTLE_PIXELS_PER_SECOND = 0.5
const TWO_PI = Math.PI * 2
const VIEWPORT_MARGIN = "100px"

const TAG_STYLE: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    willChange: "transform, opacity",
    pointerEvents: "auto",
}

const WORD_STYLE: React.CSSProperties = {
    display: "inline-block",
    transform: "translate(-50%, -50%)",
}

const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

/* ======================= Component ======================= */

export default function TextsCloud(props: Partial<TextsCloudProps> = {}) {
    const {
        words = DEFAULT_WORDS,
        bgColor = "var(--surface)",
        textColor = "var(--text)",
        speed = 0.0058,
        fontScale = 0.074,
        letterSpacingEm = 0,
        wordSpacing = 0.95,
        dragToScrub = true,
        scrubSensitivity = 0.003,
        smoothing = 0.4,
        inertia = 0.35,
    } = props

    const wordsKey = words.join("\u0000")
    const wordCount = words.length
    const points = useMemo(() => fibonacciSphere(wordCount), [wordCount])

    const hostRef = useRef<HTMLDivElement | null>(null)
    const listRef = useRef<HTMLUListElement | null>(null)
    const tagsRef = useRef<HTMLElement[]>([])
    const engineRef = useRef<CloudEngine | null>(null)

    const [size, setSize] = useState<number>(0)

    // Latest values for the animation loop (read every frame, never re-subscribed).
    const liveRef = useRef({
        size,
        speed,
        wordSpacing,
        dragToScrub,
        scrubSensitivity,
        smoothing,
        inertia,
    })
    const pointsRef = useRef(points)
    useIsomorphicLayoutEffect(() => {
        liveRef.current = { size, speed, wordSpacing, dragToScrub, scrubSensitivity, smoothing, inertia }
        pointsRef.current = points
    }, [size, speed, wordSpacing, dragToScrub, scrubSensitivity, smoothing, inertia, points])

    // Measure container
    useIsomorphicLayoutEffect(() => {
        const host = hostRef.current
        if (!host) return
        const update = () =>
            setSize(Math.max(0, Math.min(host.clientWidth, host.clientHeight)))
        update()
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", update)
            return () => window.removeEventListener("resize", update)
        }
        const resizeObserver = new ResizeObserver(update)
        resizeObserver.observe(host)
        return () => resizeObserver.disconnect()
    }, [])

    // Rotation engine: physics, render loop and pointer handling (one per instance).
    useIsomorphicLayoutEffect(() => {
        const host = hostRef.current
        if (
            !host ||
            typeof window === "undefined" ||
            typeof document === "undefined"
        ) {
            return
        }

        const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)")
        let reduced = motionPreference.matches
        const initialCursor = host.style.cursor

        let disposed = false

        // angle: what is drawn; targetAngle: where the pointer / inertia wants it to be.
        let angle = 0
        let targetAngle = 0
        let previousTarget = 0 // targetAngle at the end of the previous frame
        let omega = 0 // angular velocity of targetAngle when not dragging (rad/s)

        let dragging = false
        let activePointer = -1
        let lastPointerX = 0

        const sampleTimes = new Float64Array(VELOCITY_SAMPLES)
        const sampleXs = new Float64Array(VELOCITY_SAMPLES)
        let sampleCount = 0
        let sampleHead = 0

        let rafId = 0
        let lastTime = 0
        let inView = typeof IntersectionObserver === "undefined"
        let pageVisible = document.visibilityState !== "hidden"

        const lastTransforms: string[] = []
        const lastOpacities: string[] = []

        const autoVelocity = () => {
            const live = liveRef.current
            if (reduced) return 0
            return Math.max(0, live.speed) * REFERENCE_FPS
        }

        // Start at full auto-spin speed, like before.
        omega = autoVelocity()

        // ---------------- Physics ----------------

        const step = (dt: number) => {
            if (dt <= 0) return
            const live = liveRef.current
            const frameStartTarget = previousTarget

            if (!dragging) {
                // Exact exponential decay of the fling velocity towards the auto-spin velocity,
                // so the result does not depend on the frame rate.
                const auto = autoVelocity()
                const tau =
                    MIN_INERTIA_SECONDS +
                    clamp01(live.inertia) *
                        (MAX_INERTIA_SECONDS - MIN_INERTIA_SECONDS)
                const decay = Math.exp(-dt / tau)
                targetAngle += auto * dt + (omega - auto) * tau * (1 - decay)
                omega = auto + (omega - auto) * decay
            }

            // Exact first-order follow for a target moving linearly through the frame:
            // smooth, no overshoot, and identical at 60 / 120 / 144 Hz.
            const followSeconds =
                clamp01(live.smoothing) * MAX_SMOOTHING_SECONDS
            if (followSeconds <= 1e-4) {
                angle = targetAngle
            } else {
                const k = Math.exp(-dt / followSeconds)
                const lead =
                    ((targetAngle - frameStartTarget) / dt) * followSeconds
                angle =
                    targetAngle - lead + (angle - frameStartTarget + lead) * k
            }
            previousTarget = targetAngle

            // Keep the numbers small for sin/cos precision; all angles shift together.
            if (angle > TWO_PI || angle < -TWO_PI) {
                const shift = Math.trunc(angle / TWO_PI) * TWO_PI
                angle -= shift
                targetAngle -= shift
                previousTarget -= shift
            }
        }

        // ---------------- Render ----------------

        const render = (force: boolean) => {
            if (disposed) return
            if (force) {
                lastTransforms.length = 0
                lastOpacities.length = 0
            }

            const tags = tagsRef.current
            const sphere = pointsRef.current
            const count = Math.min(tags.length, Math.floor(sphere.length / 3))
            if (count === 0) return

            const live = liveRef.current
            const spread = live.size * 0.5 * live.wordSpacing

            // Rodrigues rotation for the fixed axis
            const sin = Math.sin(angle)
            const cos = Math.cos(angle)
            const t = 1 - cos
            const r00 = cos + AXIS_X * AXIS_X * t
            const r01 = AXIS_X * AXIS_Y * t - AXIS_Z * sin
            const r02 = AXIS_X * AXIS_Z * t + AXIS_Y * sin
            const r10 = AXIS_Y * AXIS_X * t + AXIS_Z * sin
            const r11 = cos + AXIS_Y * AXIS_Y * t
            const r12 = AXIS_Y * AXIS_Z * t - AXIS_X * sin
            const r20 = AXIS_Z * AXIS_X * t - AXIS_Y * sin
            const r21 = AXIS_Z * AXIS_Y * t + AXIS_X * sin
            const r22 = cos + AXIS_Z * AXIS_Z * t

            for (let i = 0; i < count; i++) {
                const x = sphere[i * 3]
                const y = sphere[i * 3 + 1]
                const z = sphere[i * 3 + 2]
                const X = r00 * x + r01 * y + r02 * z
                const Y = r10 * x + r11 * y + r12 * z
                const Z = r20 * x + r21 * y + r22 * z

                const transform = `translate(${round(spread * X, 100)}px, ${round(
                    spread * Y,
                    100
                )}px) scale(${round((Z + 2) / 3, 10000)})`
                const opacity = String(round(clamp01((Z + 1.5) / 2.5), 1000))

                // Only touch the DOM when a value actually changed.
                const element = tags[i]
                if (lastTransforms[i] !== transform) {
                    element.style.transform = transform
                    lastTransforms[i] = transform
                }
                if (lastOpacities[i] !== opacity) {
                    element.style.opacity = opacity
                    lastOpacities[i] = opacity
                }
            }
        }

        // ---------------- Loop (runs only while something moves) ----------------

        const isSettled = () => {
            const live = liveRef.current
            const radius = Math.max(1, live.size * 0.5 * live.wordSpacing)
            if (Math.abs(targetAngle - angle) * radius > SETTLE_PIXELS)
                return false
            if (dragging) return true
            return (
                autoVelocity() === 0 &&
                Math.abs(omega) * radius <= SETTLE_PIXELS_PER_SECOND
            )
        }

        const tick = (now: number) => {
            rafId = 0
            if (disposed) return
            const dt = Math.min(
                MAX_DELTA_SECONDS,
                Math.max(0, (now - lastTime) / 1000)
            )
            lastTime = now
            step(dt)
            render(false)
            if (!inView || !pageVisible) return
            if (isSettled()) {
                if (!dragging) omega = 0
                angle = targetAngle
                previousTarget = targetAngle
                return
            }
            rafId = requestAnimationFrame(tick)
        }

        const wake = () => {
            if (disposed || rafId || !inView || !pageVisible) return
            if (isSettled()) return
            // Resuming after a pause starts from "now", so there is no delta-time jump.
            lastTime = performance.now()
            rafId = requestAnimationFrame(tick)
        }

        // ---------------- Pointer: smoothed drag + inertia ----------------

        const pushSample = (time: number, x: number) => {
            sampleTimes[sampleHead] = time
            sampleXs[sampleHead] = x
            sampleHead = (sampleHead + 1) % VELOCITY_SAMPLES
            sampleCount = Math.min(sampleCount + 1, VELOCITY_SAMPLES)
        }

        // Pointer velocity (px/s) over the last ~100 ms; zero if the pointer was held still.
        const releaseVelocity = (now: number) => {
            if (sampleCount < 2) return 0
            const newest =
                (sampleHead - 1 + VELOCITY_SAMPLES) % VELOCITY_SAMPLES
            const newestTime = sampleTimes[newest]
            if (now - newestTime > HOLD_RESET_MS) return 0
            let oldest = newest
            for (let k = 1; k < sampleCount; k++) {
                const index = (newest - k + VELOCITY_SAMPLES) % VELOCITY_SAMPLES
                if (newestTime - sampleTimes[index] > VELOCITY_WINDOW_MS) break
                oldest = index
            }
            const elapsed = newestTime - sampleTimes[oldest]
            if (elapsed <= 0) return 0
            return ((sampleXs[newest] - sampleXs[oldest]) / elapsed) * 1000
        }

        const onPointerDown = (event: PointerEvent) => {
            if (dragging || !liveRef.current.dragToScrub) return
            if (event.pointerType === "mouse" && event.button !== 0) return
            dragging = true
            activePointer = event.pointerId
            lastPointerX = event.clientX
            sampleCount = 0
            sampleHead = 0
            pushSample(performance.now(), event.clientX)
            // Grabbing catches the cloud: inertia and auto-spin stop, the drawn angle eases to rest.
            omega = 0
            host.style.cursor = "grabbing"
            try {
                host.setPointerCapture(event.pointerId)
            } catch {}
            wake()
        }

        const onPointerMove = (event: PointerEvent) => {
            if (!dragging || event.pointerId !== activePointer) return
            const dx = event.clientX - lastPointerX
            lastPointerX = event.clientX
            targetAngle += dx * liveRef.current.scrubSensitivity
            if (reduced) {
                angle = targetAngle
                previousTarget = targetAngle
                render(false)
            } else {
                pushSample(performance.now(), event.clientX)
                wake()
            }
        }

        const endDrag = (event: PointerEvent, fling: boolean) => {
            if (!dragging || event.pointerId !== activePointer) return
            dragging = false
            activePointer = -1
            const velocity = fling && !reduced ? releaseVelocity(performance.now()) : 0
            const sensitivity = liveRef.current.scrubSensitivity
            omega = Math.max(
                -MAX_FLING_VELOCITY,
                Math.min(MAX_FLING_VELOCITY, velocity * sensitivity)
            )
            host.style.cursor = liveRef.current.dragToScrub ? "grab" : ""
            try {
                host.releasePointerCapture(event.pointerId)
            } catch {}
            wake()
        }

        const onPointerUp = (event: PointerEvent) => endDrag(event, true)
        const onPointerCancel = (event: PointerEvent) => endDrag(event, false)

        host.addEventListener("pointerdown", onPointerDown)
        host.addEventListener("pointermove", onPointerMove)
        host.addEventListener("pointerup", onPointerUp)
        host.addEventListener("pointercancel", onPointerCancel)
        host.addEventListener("lostpointercapture", onPointerUp)

        // ---------------- Visibility ----------------

        const pause = () => {
            if (rafId) cancelAnimationFrame(rafId)
            rafId = 0
        }

        let intersectionObserver: IntersectionObserver | null = null
        if (typeof IntersectionObserver !== "undefined") {
            intersectionObserver = new IntersectionObserver(
                (entries) => {
                    const entry = entries[entries.length - 1]
                    if (!entry) return
                    inView = entry.isIntersecting
                    if (inView) wake()
                    else pause()
                },
                { rootMargin: VIEWPORT_MARGIN }
            )
            intersectionObserver.observe(host)
        }

        const onVisibilityChange = () => {
            pageVisible = document.visibilityState !== "hidden"
            if (pageVisible) wake()
            else pause()
        }
        document.addEventListener("visibilitychange", onVisibilityChange)

        const onMotionChange = () => {
            reduced = motionPreference.matches
            pause()
            targetAngle = angle
            previousTarget = angle
            omega = dragging ? 0 : autoVelocity()
            wake()
        }
        motionPreference.addEventListener("change", onMotionChange)

        const engine: CloudEngine = { render, wake }
        engineRef.current = engine
        render(true)
        wake()

        return () => {
            disposed = true
            pause()
            host.removeEventListener("pointerdown", onPointerDown)
            host.removeEventListener("pointermove", onPointerMove)
            host.removeEventListener("pointerup", onPointerUp)
            host.removeEventListener("pointercancel", onPointerCancel)
            host.removeEventListener("lostpointercapture", onPointerUp)
            if (activePointer !== -1 && host.hasPointerCapture(activePointer)) {
                host.releasePointerCapture(activePointer)
            }
            host.style.cursor = initialCursor
            intersectionObserver?.disconnect()
            document.removeEventListener("visibilitychange", onVisibilityChange)
            motionPreference.removeEventListener("change", onMotionChange)
            if (engineRef.current === engine) engineRef.current = null
        }
    }, [])

    // Words, size or spacing changed: re-collect tags and redraw before paint (no flash).
    useIsomorphicLayoutEffect(() => {
        const list = listRef.current
        tagsRef.current = list
            ? (Array.from(list.children) as HTMLElement[])
            : []
        engineRef.current?.render(true)
    }, [size, wordsKey, wordSpacing])

    // Motion settings changed: restart the loop if it went idle.
    useEffect(() => {
        engineRef.current?.wake()
    }, [
        speed,
        smoothing,
        inertia,
        dragToScrub,
        scrubSensitivity,
    ])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: 305,
                overflow: "visible",
                background: bgColor,
                userSelect: "none",
                WebkitUserSelect: "none",
                // Horizontal drags rotate; vertical swipes still scroll the page on touch.
                touchAction: dragToScrub ? "pan-y" : "auto",
                cursor: dragToScrub ? "grab" : undefined,
            }}
        >
            <ul
                ref={listRef}
                style={{
                    position: "absolute",
                    left: `calc(50% - ${size / 2}px)`,
                    top: `calc(50% - ${size / 2}px)`,
                    width: `${size}px`,
                    height: `${size}px`,
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    pointerEvents: "auto",
                    // Typography is inherited by every word.
                    fontFamily: "var(--font-label, IBM Plex Mono), monospace",
                    fontWeight: 400,
                    visibility: size ? "visible" : "hidden",
                    color: textColor,
                    fontSize: `${Math.max(10, size * fontScale)}px`,
                    lineHeight: 1,
                    letterSpacing: `${letterSpacingEm}em`,
                    whiteSpace: "nowrap",
                }}
            >
                {words.map((word, index) => (
                    <li key={index} style={TAG_STYLE}>
                        <span style={WORD_STYLE}>{word}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

/* ========================= Utils ========================= */

function normalize(v: [number, number, number]): [number, number, number] {
    const len = Math.hypot(v[0], v[1], v[2]) || 1
    return [v[0] / len, v[1] / len, v[2] / len]
}

function clamp01(value: number) {
    return value <= 0 ? 0 : value >= 1 ? 1 : value
}

function round(value: number, factor: number) {
    return Math.round(value * factor) / factor
}

// Fibonacci sphere points, packed as x, y, z triples.
function fibonacciSphere(count: number): Float64Array {
    const total = Math.max(1, count)
    const points = new Float64Array(total * 3)
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < total; i++) {
        const y = 1 - (i / Math.max(1, total - 1)) * 2
        const r = Math.sqrt(Math.max(0, 1 - y * y))
        const a = golden * i
        points[i * 3] = Math.cos(a) * r
        points[i * 3 + 1] = y
        points[i * 3 + 2] = Math.sin(a) * r
    }
    return points
}
