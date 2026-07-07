"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useState, useEffect, useMemo } from "react"
import { ArrowRight, Menu, X } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { CaseStudies } from "./case-studies"
import { LandingDesignConfigurator } from "./landing-design-configurator"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

const LOGIN_HREF = "/login"
const BRAND_BLUE = "#1a5f96"
const BRAND_BLUE_HOVER = "#155a8a"
const BRAND_BLUE_RGB = "26, 89, 150"

const ACTION_WORDS = ["Choose.", "Decide.", "Act.", "Buy.", "Engage."]

/**
 * Each bottle lives in its own folder and is built from 9 stacked layers
 * (z-0 = bare bottle + cap, z-1..z-8 = individual label elements). Stacked
 * they read as a finished pack; pulled apart they reveal the idea's parts.
 */
const BOTTLES = [
  { folder: "Bottle1", segment: "Best for Gen Z", score: "+18%", isBest: false },
  { folder: "Bottle2", segment: "Best overall", score: "+34%", isBest: true },
  { folder: "Bottle3", segment: "Best for Families", score: "+16%", isBest: false },
]
const BEST_INDEX = Math.max(0, BOTTLES.findIndex((b) => b.isBest))
const LAYER_COUNT = 9

/**
 * Deconstruction targets for the label layers (index 1..8), expressed as a
 * fraction of the bottle box size. Index 0 (the bare bottle) never moves.
 * The pattern alternates left / right and fans outward so that vertically
 * adjacent pieces always separate — guaranteeing no overlap on any device.
 * Horizontal reach is kept <= ~0.30 so scatter fits between neighbouring
 * bottles; vertical reach is kept compact so the whole scene stays in view.
 */
const SCATTER: ({ x: number; y: number; r: number } | null)[] = [
  null,
  { x: 0.28, y: -0.18, r: 10 },
  { x: -0.26, y: -0.2, r: -9 },
  { x: -0.3, y: -0.06, r: -7 },
  { x: 0.3, y: -0.05, r: 7 },
  { x: -0.28, y: 0.03, r: -6 },
  { x: 0.28, y: 0.11, r: 6 },
  { x: -0.28, y: 0.12, r: -9 },
  { x: 0.24, y: 0.1, r: 9 },
]

// Horizontal reach (fraction of box) of the widest scattered element from the
// bottle centre — used to keep everything inside the viewport on any screen.
// (Measured worst case ~0.43; 0.45 leaves a safety margin against cropping.)
const H_REACH = 0.45

/**
 * All geometry is derived from the live viewport so the scene never crops and
 * bottles/tags never overlap — from an iPhone mini up to a wide desktop.
 *
 * The single-bottle states (intro + winner) use `soloBox` and can be large,
 * while the three-up scan uses `trioBox` (small enough that 3 packs + their
 * scattered parts + tags always fit the width). The bottle element is drawn at
 * `soloBox`; during the three-up phase the whole group is scaled by
 * `trioScale`, so one CSS size serves both without ever cropping.
 */
function computeStageMetrics(vw: number, vh: number) {
  const isMobile = vw < 768
  const pad = vw < 480 ? 12 : 24
  const availW = Math.min(vw - pad * 2, 1080)
  const usableHalf = availW / 2 - 6

  const alpha = isMobile ? 0.9 : 0.92 // bottle spread as a fraction of trio box

  // Three-up size: constrained by width (fit 3 + scatter) and height.
  const trioByWidth = usableHalf / (alpha + H_REACH)
  const trioByHeight = (vh * 0.46) / 1.15
  const trioMax = isMobile ? 210 : 360
  let trioBox = Math.max(90, Math.min(trioByWidth, trioByHeight, trioMax))

  // Single-bottle size: much larger, especially on phones.
  const soloByWidth = vw * (isMobile ? 0.66 : 0.36)
  const soloByHeight = vh * (isMobile ? 0.4 : 0.52)
  const soloMax = isMobile ? 300 : 400
  let soloBox = Math.min(soloByWidth, soloByHeight, soloMax)
  soloBox = Math.max(soloBox, trioBox)

  soloBox = Math.round(soloBox)
  trioBox = Math.round(trioBox)
  const trioScale = trioBox / soloBox

  let spread = trioBox * alpha
  const maxSpread = usableHalf - H_REACH * trioBox
  if (spread > maxSpread) spread = Math.max(trioBox * 0.6, maxSpread)

  const tagW = Math.max(72, Math.min(trioBox * 1.05, spread - (isMobile ? 6 : 14)))

  // Vertical anchors (from stage centre).
  const tagYTrio = Math.round(trioBox * 0.5 + 8)
  const tagYSolo = Math.round(soloBox * 0.52 + 10)
  const stageH = Math.round(soloBox * 1.3 + 40)
  // Pull the whole scene up on phones so it sits just under the heading.
  const stageShift = isMobile ? -Math.round(vh * 0.09) : 0

  return {
    soloBox,
    trioBox,
    trioScale,
    spread: Math.round(spread),
    tagW: Math.round(tagW),
    tagYTrio,
    tagYSolo,
    stageH,
    stageShift,
  }
}

function Logo() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="flex shrink-0 cursor-pointer items-center gap-3 text-left"
    >
      <span className="text-xl font-semibold tracking-tight sm:text-2xl">
        <span style={{ color: BRAND_BLUE }}>Mind</span>
        <span className="text-gray-800">Surve</span>
      </span>
    </button>
  )
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [text, setText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [loopNum, setLoopNum] = useState(0)
  const [typingSpeed, setTypingSpeed] = useState(150)

  // Live viewport → drives fully dynamic bottle sizing (updates on resize /
  // orientation change, only when the change is meaningful to avoid churn).
  const [viewport, setViewport] = useState({ w: 1280, h: 800 })

  useEffect(() => {
    let raf = 0
    const update = () =>
      setViewport((prev) => {
        const w = window.innerWidth
        const h = window.innerHeight
        if (Math.abs(prev.w - w) < 24 && Math.abs(prev.h - h) < 40) return prev
        return { w, h }
      })
    update()
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    window.addEventListener("resize", onResize)
    window.addEventListener("orientationchange", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("orientationchange", onResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  const metrics = useMemo(() => computeStageMetrics(viewport.w, viewport.h), [viewport])
  // Mirror metrics into a ref so the (build-once) GSAP timeline can read the
  // latest values via function-based tweens without ever rebuilding the pin.
  const metricsRef = useRef(metrics)

  useEffect(() => {
    const handleType = () => {
      const i = loopNum % ACTION_WORDS.length
      const fullText = ACTION_WORDS[i]

      setText(
        isDeleting
          ? fullText.substring(0, text.length - 1)
          : fullText.substring(0, text.length + 1)
      )

      setTypingSpeed(isDeleting ? 50 : 150)

      if (!isDeleting && text === fullText) {
        setTimeout(() => setIsDeleting(true), 1500)
      } else if (isDeleting && text === "") {
        setIsDeleting(false)
        setLoopNum(loopNum + 1)
        setTypingSpeed(500)
      }
    }

    const timer = setTimeout(handleType, typingSpeed)
    return () => clearTimeout(timer)
  }, [text, isDeleting, loopNum, typingSpeed])

  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Text refs
  const text1Ref = useRef<HTMLHeadingElement>(null)
  const text2Ref = useRef<HTMLHeadingElement>(null)
  const text3Ref = useRef<HTMLHeadingElement>(null)
  const text4Ref = useRef<HTMLHeadingElement>(null)

  // Background Words refs
  const heroRef = useRef<HTMLElement>(null)
  const word1ScrollRef = useRef<HTMLDivElement>(null)
  const word2ScrollRef = useRef<HTMLDivElement>(null)
  const word3ScrollRef = useRef<HTMLDivElement>(null)
  const word4ScrollRef = useRef<HTMLDivElement>(null)
  const word1MouseRef = useRef<HTMLDivElement>(null)
  const word2MouseRef = useRef<HTMLDivElement>(null)
  const word3MouseRef = useRef<HTMLDivElement>(null)
  const word4MouseRef = useRef<HTMLDivElement>(null)

  // Object refs
  const bottleRefs = useRef<HTMLDivElement[]>([])
  const layerRefs = useRef<HTMLDivElement[][]>([[], [], []])
  const tagsRef = useRef<HTMLDivElement[]>([])
  const scannerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!wrapperRef.current) return

    const scrollConfig = {
      trigger: wrapperRef.current,
      start: "top top",
      end: "+=500%",
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      refreshPriority: 2,
      invalidateOnRefresh: true,
    }

    // All size-dependent values are function-based so `invalidateOnRefresh`
    // recomputes them on resize — the pin itself is only ever built once.
    const m = () => metricsRef.current
    const bottleX = (b: number) => (b - BEST_INDEX) * m().spread

    const buildStoryTimeline = () => {
      const tl = gsap.timeline({ scrollTrigger: scrollConfig })

      // Initial state: only Bottle 1 is visible, centered and large.
      bottleRefs.current.forEach((el, b) => {
        gsap.set(el, {
          xPercent: -50,
          yPercent: -50,
          x: 0,
          y: 0,
          opacity: b === 0 ? 1 : 0,
          scale: b === 0 ? 1 : m().trioScale * 0.8,
          filter: "drop-shadow(0 14px 26px rgba(15, 23, 42, 0.10))",
        })
        layerRefs.current[b]?.forEach((layer) => {
          if (layer) gsap.set(layer, { x: 0, y: 0, rotation: 0, opacity: 1 })
        })
      })
      // Tags live at stage level (so they never inherit the group's scale).
      gsap.set(tagsRef.current, { xPercent: -50, x: 0, y: () => m().tagYTrio, opacity: 0, scale: 0.9 })
      gsap.set(scannerRef.current, { opacity: 0, scaleY: 0.6, x: () => -(m().spread + m().trioBox * 0.7) })

      // ── Phase 1 → 2 : the single weak concept splits into three routes ──
      tl.to(text1Ref.current, { opacity: 0, y: -20, duration: 1 })
        .to(text2Ref.current, { opacity: 1, y: 0, duration: 1 }, "<")
        .to(bottleRefs.current[0], { x: () => bottleX(0), scale: () => m().trioScale, duration: 1.5, ease: "power3.inOut" }, "<0.15")
        .to(bottleRefs.current[2], { x: () => bottleX(2), opacity: 1, scale: () => m().trioScale, duration: 1.5, ease: "power3.inOut" }, "<")
        .to(bottleRefs.current[1], { opacity: 1, scale: () => m().trioScale, duration: 1.1, ease: "power2.out" }, "<0.1")

      // ── Phase 3 : scan sweeps left→right, deconstructing each pack ──
      tl.to(text2Ref.current, { opacity: 0, y: -20, duration: 1 }, "+=0.4")
        .to(text3Ref.current, { opacity: 1, y: 0, duration: 1 }, "<")
        .addLabel("scan")
        .to(scannerRef.current, { opacity: 1, scaleY: 1, duration: 0.4 }, "scan")
        .fromTo(
          scannerRef.current,
          { x: () => -(m().spread + m().trioBox * 0.7) },
          { x: () => m().spread + m().trioBox * 0.7, duration: 2.6, ease: "none" },
          "scan"
        )

      BOTTLES.forEach((_, b) => {
        const at = `scan+=${0.35 + b * 0.72}`
        // Child offsets are in soloBox px; the group's trioScale renders them
        // at the correct trioBox distance.
        layerRefs.current[b]?.forEach((layer, i) => {
          const s = SCATTER[i]
          if (!s || !layer) return
          tl.to(
            layer,
            {
              x: () => s.x * m().soloBox,
              y: () => s.y * m().soloBox,
              rotation: s.r,
              duration: 1,
              ease: "power2.out",
            },
            at
          )
        })
        if (tagsRef.current[b]) {
          tl.fromTo(
            tagsRef.current[b],
            { x: () => bottleX(b), y: () => m().tagYTrio, opacity: 0, scale: 0.9 },
            { x: () => bottleX(b), y: () => m().tagYTrio, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" },
            `${at}+=0.45`
          )
        }
      })

      tl.to(scannerRef.current, { opacity: 0, duration: 0.3 }, "scan+=2.6")

      // ── Phase 4 : pieces snap back, then the losers slide away and the
      //             winning pack glides to the middle and grows. ──
      tl.to(text3Ref.current, { opacity: 0, y: -20, duration: 1 }, "+=0.5")
        .to(text4Ref.current, { opacity: 1, y: 0, duration: 1 }, "<")
        .addLabel("rebuild")

      BOTTLES.forEach((_, b) => {
        layerRefs.current[b]?.forEach((layer, i) => {
          if (i === 0 || !layer) return
          tl.to(layer, { x: 0, y: 0, rotation: 0, duration: 1.2, ease: "power3.inOut" }, "rebuild")
        })
      })

      tl.addLabel("choose", ">")

      // The two runner-up packs slide outward and fade out (no blur) …
      bottleRefs.current.forEach((el, b) => {
        if (b === BEST_INDEX) return
        const dir = b < BEST_INDEX ? -1 : 1
        tl.to(
          el,
          { x: () => dir * (m().spread + m().trioBox * 1.1), scale: () => m().trioScale * 0.7, opacity: 0, duration: 1.3, ease: "power3.inOut" },
          "choose"
        )
      })
      tagsRef.current.forEach((tag, b) => {
        if (b === BEST_INDEX || !tag) return
        const dir = b < BEST_INDEX ? -1 : 1
        tl.to(tag, { x: () => dir * (m().spread + m().trioBox), opacity: 0, duration: 1, ease: "power3.inOut" }, "choose")
      })

      // … while the winner grows to full size at dead-centre.
      tl.to(
        bottleRefs.current[BEST_INDEX],
        {
          x: 0,
          y: -6,
          scale: 1,
          filter: `drop-shadow(0 30px 52px rgba(${BRAND_BLUE_RGB}, 0.28))`,
          duration: 1.3,
          ease: "power3.inOut",
        },
        "choose"
      )
        .to(
          tagsRef.current[BEST_INDEX],
          { x: 0, y: () => m().tagYSolo, scale: 1.05, duration: 1.1, ease: "power2.out" },
          "choose+=0.1"
        )
        .to(bottleRefs.current[BEST_INDEX], { y: -14, duration: 1.4, ease: "sine.inOut" }, ">-0.1")

      return tl
    }

    const mm = gsap.matchMedia()
    mm.add("(min-width: 320px)", () => buildStoryTimeline())

    return () => mm.revert()
  }, { scope: wrapperRef })

  // On viewport change: update the metrics the timeline reads, then ask
  // ScrollTrigger to recompute its function-based values (no pin rebuild).
  useEffect(() => {
    metricsRef.current = metrics
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [metrics])

  useGSAP(() => {
    if (!heroRef.current) return

    // Scroll Parallax
    gsap.to(word1ScrollRef.current, { y: -200, rotation: -2, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true } })
    gsap.to(word2ScrollRef.current, { y: -350, rotation: 2, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true } })
    gsap.to(word3ScrollRef.current, { y: -150, rotation: -1, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true } })
    gsap.to(word4ScrollRef.current, { y: -300, rotation: 3, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true } })

    // Mouse Parallax
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const moveX = (clientX - centerX) / 30
      const moveY = (clientY - centerY) / 30
      
      const rotate = (clientX - centerX) / 100

      gsap.to(word1MouseRef.current, { x: moveX * 2, y: moveY * 2, rotation: rotate * 0.5, duration: 1, ease: "power2.out" })
      gsap.to(word2MouseRef.current, { x: moveX * -2.5, y: moveY * -2.5, rotation: rotate * -0.5, duration: 1, ease: "power2.out" })
      gsap.to(word3MouseRef.current, { x: moveX * 3, y: moveY * 3, rotation: rotate * 0.8, duration: 1, ease: "power2.out" })
      gsap.to(word4MouseRef.current, { x: moveX * -2, y: moveY * -2, rotation: rotate * -0.8, duration: 1, ease: "power2.out" })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, { scope: heroRef })

  return (
    <div
      className="min-h-screen bg-white font-[family-name:var(--font-inter),ui-sans-serif,system-ui,sans-serif] text-gray-800 antialiased selection:bg-[#1a5f96] selection:text-white"
    >
      {/* Navigation */}
      <nav className="fixed z-50 w-full bg-white/80 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo />
            <div className="hidden items-center space-x-8 md:flex">
              <a href="#story" className="font-medium text-gray-600 transition-colors hover:text-[#1a5f96]">
                How it works
              </a>
              <a href="#case-studies" className="font-medium text-gray-600 transition-colors hover:text-[#1a5f96]">
                Case Studies
              </a>
              <Link
                href={LOGIN_HREF}
                className="rounded-full bg-[#1a5f96] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#155a8a] hover:shadow-lg"
              >
                Login / Create an account
              </Link>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Link
                href={LOGIN_HREF}
                className="rounded-full bg-[#1a5f96] px-3 py-2 text-xs font-semibold text-white"
              >
                Login
              </Link>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-gray-100 px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {[
                ["#story", "How it works"],
                ["#case-studies", "Case Studies"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="text-base font-medium text-gray-700"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
              <Link
                href={LOGIN_HREF}
                className="mt-2 rounded-full bg-[#1a5f96] py-3 text-center text-sm font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                Login / Create an account
              </Link>
            </nav>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} id="hero" className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-20 text-center bg-white">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0 h-full w-full pointer-events-none overflow-hidden text-slate-100 font-black uppercase leading-none select-none flex flex-col justify-around py-20" style={{ color: '#F1F5F9' }}>
          <div ref={word1ScrollRef} className="w-full text-left pl-[5%] md:pl-[10%]" style={{ fontSize: 'clamp(3.5rem, 11vw, 12rem)' }}>
            <div ref={word1MouseRef} className="inline-block">INSIGHT</div>
          </div>
          <div ref={word2ScrollRef} className="w-full text-right pr-[5%] md:pr-[15%]" style={{ fontSize: 'clamp(3.5rem, 11vw, 12rem)' }}>
            <div ref={word2MouseRef} className="inline-block">PATTERN</div>
          </div>
          <div ref={word3ScrollRef} className="w-full text-left pl-[10%] md:pl-[20%]" style={{ fontSize: 'clamp(3.5rem, 11vw, 12rem)' }}>
            <div ref={word3MouseRef} className="inline-block">CHOICE</div>
          </div>
          <div ref={word4ScrollRef} className="w-full text-right pr-[5%] md:pr-[10%]" style={{ fontSize: 'clamp(3.5rem, 11vw, 12rem)' }}>
            <div ref={word4MouseRef} className="inline-block">DECISION</div>
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <h1 className="mb-6 text-5xl font-semibold tracking-tighter text-slate-900 md:text-7xl lg:text-8xl" style={{ letterSpacing: '-0.04em' }}>
            Understand Why <br className="hidden md:block" /> People{" "}
            <br className="md:hidden" />
            <span className="block min-h-[1.15em] text-[#1a5f96] md:inline md:min-h-0">
              <span className="inline-block min-w-[9ch] md:min-w-0">
                {text}
                <span className="animate-pulse font-light">|</span>
              </span>
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg font-normal tracking-tight text-slate-500 md:text-xl">
            Reveal the hidden drivers behind customer decisions using Mind Genomics.
            Stop guessing. Start knowing.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={LOGIN_HREF}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#1a5f96] px-8 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-[#155a8a] hover:shadow-xl"
              style={{ boxShadow: `0 10px 25px rgba(${BRAND_BLUE_RGB}, 0.35)` }}
            >
              Login / Create an account
            </Link>
            <Link
              href={LOGIN_HREF}
              className="inline-flex h-12 items-center justify-center rounded-full border border-gray-200 bg-white px-8 text-sm font-medium text-gray-800 transition-all hover:bg-gray-50"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Pinned Scroll Story */}
      <section id="story" ref={wrapperRef} className="relative z-30 w-full bg-white">
        <div ref={containerRef} className="flex h-screen w-full flex-col items-center justify-center overflow-hidden">

          {/* Text Container */}
          <div className="absolute top-[8%] z-20 w-full px-4 text-center sm:top-[12%]">
            <h2 ref={text1Ref} className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Why does one design win?
            </h2>
            <h2 ref={text2Ref} className="absolute left-0 top-0 w-full px-4 text-2xl font-medium tracking-tight text-slate-900 opacity-0 sm:text-3xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Break the weak concept into testable alternatives.
            </h2>
            <h2 ref={text3Ref} className="absolute left-0 top-0 w-full px-4 text-2xl font-medium tracking-tight text-slate-900 opacity-0 sm:text-3xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Scan what people actually respond to.
            </h2>
            <h2 ref={text4Ref} className="absolute left-0 top-0 w-full px-4 text-2xl font-medium tracking-tight text-slate-900 opacity-0 sm:text-3xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Choose the strongest design for each segment.
            </h2>
          </div>

          {/* Layered Bottle Container — height + vertical offset driven by live metrics */}
          <div
            id="bottle-stage"
            className="relative z-10 w-full max-w-6xl"
            style={{ height: metrics.stageH, transform: `translateY(${metrics.stageShift}px)` }}
          >
            {/* Scanner Line */}
            <div
              ref={scannerRef}
              className="absolute left-1/2 top-1/2 z-30 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                height: metrics.trioBox * 0.86,
                backgroundColor: BRAND_BLUE,
                boxShadow: `0 0 22px 3px rgba(${BRAND_BLUE_RGB}, 0.75)`,
              }}
            />

            {/* Bottles — each a stack of 9 layers (z-0 base + z-1..z-8 elements) */}
            {BOTTLES.map((bottle, b) => (
              <div
                key={bottle.folder}
                ref={(el) => {
                  if (el) bottleRefs.current[b] = el
                }}
                className="absolute left-1/2 top-1/2"
                style={{ height: metrics.soloBox, width: metrics.soloBox }}
              >
                {Array.from({ length: LAYER_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      if (el) layerRefs.current[b][i] = el
                    }}
                    className="absolute inset-0 will-change-transform"
                  >
                    <Image
                      src={`/landing-page/${bottle.folder}/z-${i}.webp`}
                      alt={i === 0 ? `${bottle.segment} design` : ""}
                      fill
                      sizes="(max-width: 768px) 66vw, 400px"
                      className="object-contain"
                      priority={b === 0}
                    />
                  </div>
                ))}
              </div>
            ))}

            {/* Segment tags — positioned at stage level so they keep a fixed,
                readable size regardless of the bottle group's scale. */}
            {BOTTLES.map((bottle, b) => (
              <div
                key={`tag-${bottle.folder}`}
                ref={(el) => {
                  if (el) tagsRef.current[b] = el
                }}
                className="pointer-events-none absolute left-1/2 top-1/2 rounded-xl border border-slate-200 bg-white px-2 py-1 text-center opacity-0 shadow-md sm:rounded-2xl sm:px-3 sm:py-1.5"
                style={{ width: metrics.tagW }}
              >
                <div className="text-[10px] font-semibold leading-tight text-slate-900 sm:text-xs">{bottle.segment}</div>
                <div className={`mt-0.5 text-[10px] font-semibold leading-tight sm:text-xs ${bottle.isBest ? "text-[#1a5f96]" : "text-slate-500"}`}>
                  {bottle.score} lift
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spacer to prevent abrupt transition from pinned story */}
      <div className="relative z-0 h-56 w-full bg-white md:h-[35vh]"></div>

      {/* Design Configurator */}
      <div className="bg-slate-50/50 border-t border-slate-100">
        <LandingDesignConfigurator />
      </div>

      {/* Case Studies / Proof */}
      <CaseStudies />

      {/* Final CTA */}
      <section id="cta" className="relative overflow-hidden py-24" style={{ backgroundColor: BRAND_BLUE }}>
        <div className="absolute inset-0 opacity-10" aria-hidden>
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="landing-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40V0H40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#landing-grid-pattern)" />
          </svg>
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-6 text-lg leading-relaxed text-white md:text-xl">
            Stop relying on guesswork and surface-level data. Let&apos;s design an experiment that gives you the
            precise answers you need to scale confidently.
          </p>
          <Link
            href={LOGIN_HREF}
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-xl font-bold shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-gray-50 hover:shadow-2xl"
            style={{ color: BRAND_BLUE }}
          >
            Login / Create an account
            <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#1A1A1A] py-8 text-center">
        <p className="text-sm text-gray-500">&copy; 2026 TikunTech. All Rights Reserved.</p>
      </footer>

    </div>
  )
}
