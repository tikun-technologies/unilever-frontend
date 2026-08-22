"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useState, useEffect, useMemo } from "react"
import { ArrowRight, Check, Menu, X } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
// import { CaseStudies } from "./case-studies"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { LandingDesignConfigurator } from "./landing-design-configurator"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

const LOGIN_HREF = "/login"
const CONTACT_MAILTO = "mailto:jbrown@tikuntech.com"
const BRAND_BLUE = "#1a5f96"
const BRAND_BLUE_HOVER = "#155a8a"
const BRAND_BLUE_RGB = "26, 89, 150"

const ACTION_WORDS = ["Choose.", "Decide.", "Act.", "Buy.", "Engage."]

/**
 * Every pack is composed of five stacked, perfectly-registered layers (each a
 * full 1024² transparent canvas exported from the design system). Painted
 * back-to-front they read as a finished bottle; pulled apart they reveal the
 * five testable "elements" of a Mind Genomics study.
 *
 * `bottle` is the base body and never leaves its place during the scan; the
 * other four lift off and are called out with a minimalist leader line.
 */
type LayerKey = "bottle" | "element" | "product" | "proposition" | "pump"
const RENDER_ORDER: LayerKey[] = ["bottle", "element", "product", "proposition", "pump"]

type Design = {
  key: string
  bottle: string
  element: string
  product: string
  proposition: string
  pump: string
  isBest?: boolean
}

/**
 * The story deliberately uses three candidates at every breakpoint. That gives
 * every scattered element enough room for a readable callout while keeping the
 * winning mink pack dead-centre.
 */
const DESIGNS: Design[] = [
  { key: "rosewood", bottle: "rosewood", element: "drop", product: "bodywash", proposition: "hydrates", pump: "A-light" },
  { key: "sage", bottle: "sage", element: "leaf", product: "moisturiser", proposition: "nourishes", pump: "A-light" },
  { key: "mink", bottle: "mink", element: "flame", product: "shampoo", proposition: "revives", pump: "A-light", isBest: true },
  { key: "periwinkle", bottle: "periwinkle", element: "ice", product: "deodorant", proposition: "freshens", pump: "A-light" },
  { key: "terracotta", bottle: "terracotta", element: "mineral", product: "handwash", proposition: "protects", pump: "A-light" },
]
const STORY_DESIGNS = [DESIGNS[1], DESIGNS[2], DESIGNS[3]]
const assetSrc = (type: LayerKey, name: string) => `/landing-page/story/${type}/${name}.webp`

// The pump art is light; a hairline shadow keeps its edge on white. The printed
// icon / text layers are near-white, so they get a much stronger treatment
// (below) to read clearly once they drift off the coloured bottle.
const PUMP_OUTLINE =
  "drop-shadow(0.5px 0 0.4px rgba(15,23,42,0.3)) drop-shadow(-0.5px 0 0.4px rgba(15,23,42,0.3)) drop-shadow(0 0.5px 0.4px rgba(15,23,42,0.3)) drop-shadow(0 -0.5px 0.4px rgba(15,23,42,0.3))"
// Darken the faint icon / product / claim art into a crisp slate so every
// scattered element is clearly visible against the white background.
const INK_FILTER =
  "brightness(0.08) contrast(1.45) saturate(0) drop-shadow(0 0 0.6px rgba(15,23,42,0.45))"

function layerFilter(key: LayerKey): string | undefined {
  if (key === "bottle") return undefined
  if (key === "pump") return PUMP_OUTLINE
  return INK_FILTER
}

/**
 * Per-element performance callouts (Mind Genomics style): each testable element
 * gets its own segment + utility lift so the deconstruction reads like real
 * results rather than plain part names.
 */
const STAT_LABELS: Record<LayerKey, { seg: string; values: string[] }> = {
  element: { seg: "Gen Z", values: ["+14%", "+22%", "+11%"] },
  product: { seg: "Millennials", values: ["+9%", "+15%", "+12%"] },
  proposition: { seg: "Females", values: ["+13%", "+17%", "+8%"] },
  pump: { seg: "Males", values: ["+10%", "+12%", "+7%"] },
  bottle: { seg: "Overall", values: ["+12%", "+19%", "+10%"] },
}

/**
 * Scatter offsets for the four detachable layers (fraction of a pack box),
 * applied to EVERY pack as the scanner passes. The bottle base never moves.
 * Kept compact so each pack's parts stay inside its own lane — no pack ever
 * collides with its neighbour, on any screen.
 */
const SCATTER: Partial<Record<LayerKey, { x: number; y: number; r: number }>> = {
  pump: { x: 0.0, y: -0.42, r: 0 },
  product: { x: 0.34, y: -0.12, r: 5 },
  proposition: { x: 0.34, y: 0.22, r: -5 },
  element: { x: -0.36, y: 0.05, r: -6 },
}

const MIX_SHIFT: Record<LayerKey, number> = {
  bottle: 0,
  pump: 1,
  product: 2,
  proposition: 1,
  element: 1,
}

function mixedAsset(destination: number, key: LayerKey) {
  const source = (destination - MIX_SHIFT[key] + STORY_DESIGNS.length) % STORY_DESIGNS.length
  return STORY_DESIGNS[source][key]
}

/**
 * Approximate centre of each layer's visible artwork inside its square canvas,
 * expressed as an offset (fraction of box) from the box centre. Combined with
 * the scatter offset this gives the true on-screen point a leader line should
 * touch, so every callout line clearly connects to its element.
 */
const CONTENT_CENTER: Record<LayerKey, { x: number; y: number }> = {
  pump: { x: -0.02, y: -0.28 },
  product: { x: 0.0, y: 0.0 },
  element: { x: 0.0, y: 0.09 },
  proposition: { x: 0.0, y: 0.18 },
  bottle: { x: 0.0, y: 0.06 },
}

/**
 * Where each component's leader-line label sits (fraction of a pack box from
 * the centre pack's centre). Anchors fan just beyond each scattered part into
 * the free space around the middle pack so the callouts never overlap.
 */
const LABEL_POS: Record<LayerKey, { x: number; y: number }> = {
  pump: { x: -0.34, y: -0.62 },
  product: { x: 0.66, y: -0.16 },
  proposition: { x: 0.66, y: 0.44 },
  element: { x: -0.66, y: 0.12 },
  bottle: { x: 0.2, y: 0.66 },
}
// On phones every bottle owns one narrow vertical callout lane. This avoids
// horizontal card collisions while preserving a line to all five elements.
const MOBILE_LABEL_POS: Record<LayerKey, { x: number; y: number }> = {
  pump: { x: 0, y: -0.96 },
  product: { x: 0.1, y: -0.48 },
  element: { x: -0.1, y: 0.55 },
  proposition: { x: 0.1, y: 0.82 },
  bottle: { x: 0, y: 1.09 },
}
const CALLOUT_KEYS: LayerKey[] = ["pump", "product", "proposition", "element", "bottle"]

/**
 * All geometry is derived from the live viewport so the scene never crops and
 * nothing overlaps — from a small phone up to a wide desktop.
 *
 * `heroBox` sizes the single centred pack (intro + winner). `packBox` sizes
 * each pack in the three-up row; a pack is drawn at `heroBox` and the whole
 * group is scaled by `packScale`, so one CSS size serves both states.
 */
function computeStageMetrics(vw: number, vh: number) {
  const isMobile = vw < 768
  const count = 3
  const pad = vw < 480 ? 12 : 24
  const availW = Math.min(vw - pad * 2, 1180)
  const half = availW / 2

  // Single hero pack.
  const heroByW = vw * (isMobile ? 0.6 : 0.32)
  const heroByH = vh * (isMobile ? 0.36 : 0.46)
  const heroMax = isMobile ? 260 : 360
  const heroBox = Math.round(Math.max(150, Math.min(heroByW, heroByH, heroMax)))

  // Multi-up packs: must fit `count` across the width without touching.
  const packByW = availW / (count * (isMobile ? 1.08 : 1.4))
  const packByH = (vh * (isMobile ? 0.3 : 0.36)) / 1.15
  const packMax = isMobile ? 118 : 205
  let packBox = Math.round(Math.max(70, Math.min(packByW, packByH, packMax)))
  if (packBox > heroBox) packBox = heroBox
  const packScale = packBox / heroBox

  // Even, centred spread for the multi-up row (never lets packs touch).
  const step = Math.min((availW - packBox) / (count - 1), packBox * (isMobile ? 1.14 : 1.58))
  const positions = Array.from({ length: count }, (_, i) => Math.round((i - (count - 1) / 2) * step))

  // Callouts for every element of every pack. Positions are local to each
  // bottle lane, then clamped to the stage edges. This keeps all 15 labels
  // readable without allowing them to sit over a bottle or another callout.
  const edgeSafe = half - (isMobile ? 27 : 58)
  const explode = positions.flatMap((baseX, bottleIndex) =>
    CALLOUT_KEYS.map((key) => {
      const s = SCATTER[key] ?? { x: 0, y: 0 }
      const c = CONTENT_CENTER[key]
      const visX = Math.round(baseX + (c.x + s.x) * packBox)
      const visY = Math.round((c.y + s.y) * packBox)
      const lp = isMobile ? MOBILE_LABEL_POS[key] : LABEL_POS[key]
      const rawLabelX = baseX + lp.x * packBox
      const labelX = Math.round(Math.max(-edgeSafe, Math.min(edgeSafe, rawLabelX)))
      const labelY = Math.round(lp.y * packBox)
      const dx = labelX - visX
      const dy = labelY - visY
      const lineLen = Math.round(Math.hypot(dx, dy))
      const lineAngle = (Math.atan2(dy, dx) * 180) / Math.PI
      return { bottleIndex, key, visX, visY, labelX, labelY, lineLen, lineAngle }
    })
  )

  const scannerH = Math.round(packBox * 1.0)
  const scanReach = Math.round(Math.abs(positions[positions.length - 1]) + packBox * 0.7)
  const stageH = Math.round(heroBox * 1.72 + 40)
  // Lift the complete three-bottle/callout cluster above short mobile browser
  // chrome so the two upper and three lower callout rows remain visible.
  const stageShift = isMobile ? -Math.round(vh * 0.1) : 0

  return {
    isMobile,
    count,
    heroBox,
    packBox,
    packScale,
    positions,
    explode,
    scannerH,
    scanReach,
    stageH,
    stageShift,
  }
}

type StageMetrics = ReturnType<typeof computeStageMetrics>

function Logo() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="flex shrink-0 cursor-pointer items-center text-left"
    >
      <BrandLogo className="text-lg sm:text-2xl" />
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

  // Three designs leave enough room to label every scattered element.
  const count = metrics.count
  const visibleDesigns = STORY_DESIGNS
  const bestDisplay = Math.floor(count / 2)

  // Per-element performance callout copy.
  const calloutByKey = (key: LayerKey, bottleIndex: number) => ({
    seg: STAT_LABELS[key].seg,
    delta: STAT_LABELS[key].values[bottleIndex],
  })

  // Object refs
  const bottleRefs = useRef<HTMLDivElement[]>([])
  const layerRefs = useRef<HTMLDivElement[][]>([])
  const mixedOverlayRefs = useRef<HTMLDivElement[]>([])
  const calloutLabelRefs = useRef<HTMLDivElement[]>([])
  const calloutLineRefs = useRef<HTMLDivElement[]>([])
  const scannerRef = useRef<HTMLDivElement>(null)
  const winnerBadgeRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!wrapperRef.current) return

    const scrollConfig = {
      trigger: wrapperRef.current,
      start: "top top",
      end: "+=520%",
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      refreshPriority: 2,
      invalidateOnRefresh: true,
    }

    // Size-dependent values are read live (function-based) so
    // `invalidateOnRefresh` recomputes them on resize without rebuilding.
    const m = () => metricsRef.current
    const hero = bestDisplay // winning (mink) pack — always dead-centre
    const start = 0 // the single "starter" pack shown first
    const layerOf = (b: number, key: LayerKey) => layerRefs.current[b]?.[RENDER_ORDER.indexOf(key)]
    const scatterKeys: LayerKey[] = ["pump", "product", "proposition", "element"]

    const buildStoryTimeline = () => {
      const tl = gsap.timeline({ scrollTrigger: scrollConfig })
      const total = bottleRefs.current.length || m().count

      // ── Initial state: a single pack, centred and large ──
      bottleRefs.current.forEach((el, b) => {
        if (!el) return
        gsap.set(el, {
          xPercent: -50,
          yPercent: -50,
          x: 0,
          y: 0,
          rotation: 0,
          opacity: b === start ? 1 : 0,
          scale: b === start ? 1 : m().packScale * 0.7,
          filter: "drop-shadow(0 18px 30px rgba(15, 23, 42, 0.10))",
        })
        layerRefs.current[b]?.forEach((layer) => {
          if (layer) gsap.set(layer, { x: 0, y: 0, rotation: 0, opacity: 1 })
        })
      })
      gsap.set(calloutLabelRefs.current, { opacity: 0, scale: 0.85 })
      gsap.set(calloutLineRefs.current, { opacity: 0 })
      gsap.set(mixedOverlayRefs.current, { opacity: 0 })
      gsap.set(winnerBadgeRef.current, { opacity: 0, y: 12, scale: 0.9 })
      gsap.set(scannerRef.current, { opacity: 0, x: () => -m().scanReach })

      // ── Phase 1 → 2 : one idea multiplies into testable alternatives ──
      tl.to(text1Ref.current, { opacity: 0, y: -20, duration: 0.65 })
        .to(text2Ref.current, { opacity: 1, y: 0, duration: 0.65 }, ">-0.1")
        // starter pack shrinks into its row slot …
        .to(
          bottleRefs.current[start],
          { x: () => m().positions[start], scale: () => m().packScale, duration: 1.2, ease: "power3.inOut" },
          "<0.1"
        )
      // … and the other candidates fan out from the centre.
      bottleRefs.current.forEach((el, b) => {
        if (b === start || !el) return
        tl.fromTo(
          el,
          { opacity: 0, x: 0, scale: () => m().packScale * 0.7 },
          { opacity: 1, x: () => m().positions[b], scale: () => m().packScale, duration: 1.1, ease: "power3.out" },
          `<${0.05 + Math.abs(b - start) * 0.06}`
        )
      })

      // ── Phase 3 : the scanner sweeps and EVERY pack comes apart ──
      tl.to(text2Ref.current, { opacity: 0, y: -20, duration: 0.65 }, "+=0.4")
        .to(text3Ref.current, { opacity: 1, y: 0, duration: 0.65 }, ">-0.1")
        .addLabel("scan")
        .to(scannerRef.current, { opacity: 1, duration: 0.3 }, "scan")
        .fromTo(
          scannerRef.current,
          { x: () => -m().scanReach },
          { x: () => m().scanReach, duration: 2.6, ease: "none" },
          "scan"
        )

      // Each pack's four detachable layers scatter as the scanner reaches it.
      const spanStep = total > 1 ? 1.9 / (total - 1) : 0
      bottleRefs.current.forEach((el, b) => {
        if (!el) return
        const at = `scan+=${0.35 + b * spanStep}`
        scatterKeys.forEach((key) => {
          const layer = layerOf(b, key)
          const s = SCATTER[key]
          if (!layer || !s) return
          tl.to(
            layer,
            { x: () => s.x * m().heroBox, y: () => s.y * m().heroBox, rotation: s.r, duration: 0.9, ease: "power2.out" },
            at
          )
        })
      })

      // Once everything is apart, all 15 minimalist callouts fan in — one for
      // every part (including each bottle body) across all three candidates.
      calloutLabelRefs.current.forEach((_, ci) => {
        const line = calloutLineRefs.current[ci]
        const label = calloutLabelRefs.current[ci]
        if (line) tl.to(line, { opacity: 1, duration: 0.35, ease: "power2.out" }, `scan+=${2.25 + ci * 0.025}`)
        if (label) tl.to(label, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.35)" }, `scan+=${2.32 + ci * 0.025}`)
      })

      tl.to(scannerRef.current, { opacity: 0, duration: 0.3 }, "scan+=2.6")

      // ── Phase 4 : every element visibly changes bottle, then selected
      // elements from the side candidates assemble the winning combination ──
      tl.to(text3Ref.current, { opacity: 0, y: -20, duration: 0.65 }, "+=0.6")
        .to(text4Ref.current, { opacity: 1, y: 0, duration: 0.65 }, ">-0.1")
        .addLabel("mix")

      // Labels retract.
      tl.to(calloutLabelRefs.current, { opacity: 0, scale: 0.85, duration: 0.35 }, "mix")
        .to(calloutLineRefs.current, { opacity: 0, duration: 0.35 }, "mix")

      // Different layer types rotate in opposite directions and land on a
      // DIFFERENT bottle. Two explicit legs make the exchange impossible to
      // mistake for parts simply returning to their original coordinates.
      bottleRefs.current.forEach((el, b) => {
        if (!el) return
        scatterKeys.forEach((key, i) => {
          const layer = layerOf(b, key)
          if (!layer) return
          const destination = (b + MIX_SHIFT[key]) % total
          const direction = destination > b ? 1 : -1
          tl.to(
            layer,
            {
              x: () => ((m().positions[destination] - m().positions[b]) / m().packScale) * 0.52,
              // On phones keep every travel arc below the heading; desktop
              // retains the wider alternating up/down choreography.
              y: () =>
                m().isMobile
                  ? (i % 2 === 0 ? 0.18 : 0.4) * m().heroBox
                  : (i % 2 === 0 ? -0.52 : 0.52) * m().heroBox,
              rotation: direction * (105 + i * 18),
              duration: 0.75,
              ease: "power2.in",
            },
            `mix+=${0.2 + i * 0.05}`
          )
          tl.to(
            layer,
            {
              x: () => (m().positions[destination] - m().positions[b]) / m().packScale,
              y: 0,
              // Complete the visible turn but settle upright so the incoming
              // 1024² layer re-registers precisely on its new bottle.
              rotation: direction * 360,
              duration: 0.75,
              ease: "power2.out",
            },
            `mix+=${0.95 + i * 0.05}`
          )
        })
      })

      // Promote the completed combinations to stage-level overlays. This keeps
      // every incoming element above every bottle body (independent of each
      // bottle wrapper's stacking context).
      const detachableLayers = layerRefs.current.flatMap((layers) =>
        scatterKeys.map((key) => layers?.[RENDER_ORDER.indexOf(key)]).filter(Boolean)
      )
      tl.addLabel("mixed", "mix+=1.75")
        .to(detachableLayers, { opacity: 0, duration: 0.18 }, "mixed")
        .to(mixedOverlayRefs.current, { opacity: 1, duration: 0.18 }, "mixed")

      // Hold all three complete combinations long enough to read them, then
      // fade the alternatives in place. The centre cross-fades directly to
      // the final best design; no side elements travel into the middle.
      tl.addLabel("assemble", "mix+=3.2")

      scatterKeys.forEach((key, i) => {
        const winnerLayer = layerOf(hero, key)
        if (!winnerLayer) return
        tl.set(winnerLayer, { x: 0, y: 0, rotation: 0, opacity: 0 }, "assemble")
        tl.to(winnerLayer, { opacity: 1, duration: 0.55 }, `assemble+=${0.2 + i * 0.05}`)
      })

      tl.to(mixedOverlayRefs.current[hero], { opacity: 0, duration: 0.55 }, "assemble+=0.15")

      // Fade both complete side designs away exactly where they stand.
      bottleRefs.current.forEach((el, b) => {
        if (!el || b === hero) return
        tl.to(el, { opacity: 0, duration: 0.75, ease: "power2.inOut" }, "assemble")
        tl.to(mixedOverlayRefs.current[b], { opacity: 0, duration: 0.75, ease: "power2.inOut" }, "assemble")
      })

      // The winner glides to centre and grows.
      tl.addLabel("choose", "assemble+=0.9")

      tl.to(
        bottleRefs.current[hero],
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
        .to(winnerBadgeRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, "choose+=0.8")
        .to(bottleRefs.current[hero], { y: -14, duration: 1.4, ease: "sine.inOut" }, ">-0.1")

      return tl
    }

    const tl = buildStoryTimeline()
    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, { scope: wrapperRef, dependencies: [count] })

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
              <a href="#story" className="cursor-pointer font-medium text-gray-600 transition-colors hover:text-[#1a5f96]">
                How it works
              </a>
              {/* <a href="#case-studies" className="cursor-pointer font-medium text-gray-600 transition-colors hover:text-[#1a5f96]">
                Case Studies
              </a> */}
              <Link
                href={LOGIN_HREF}
                className="cursor-pointer rounded-full bg-[#1a5f96] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#155a8a] hover:shadow-lg"
              >
                Login / Create an account
              </Link>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Link
                href={LOGIN_HREF}
                className="cursor-pointer rounded-full bg-[#1a5f96] px-3 py-2 text-xs font-semibold text-white"
              >
                Login
              </Link>
              <button
                type="button"
                className="cursor-pointer rounded-lg p-2 text-slate-700 hover:bg-slate-100"
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
                // ["#case-studies", "Case Studies"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="cursor-pointer text-base font-medium text-gray-700"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
              <Link
                href={LOGIN_HREF}
                className="mt-2 cursor-pointer rounded-full bg-[#1a5f96] py-3 text-center text-sm font-semibold text-white"
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
              className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-[#1a5f96] px-8 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-[#155a8a] hover:shadow-xl"
              style={{ boxShadow: `0 10px 25px rgba(${BRAND_BLUE_RGB}, 0.35)` }}
            >
              Login / Create an account
            </Link>
            <Link
              href={CONTACT_MAILTO}
              className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white px-8 text-sm font-medium text-gray-800 transition-all hover:bg-gray-50"
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
          <div className="absolute top-[88px] z-20 w-full px-4 text-center sm:top-[12%]">
            <h2 ref={text1Ref} className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              How is a winning design built?
            </h2>
            <h2 ref={text2Ref} className="absolute left-0 top-0 w-full px-4 text-2xl font-medium tracking-tight text-slate-900 opacity-0 sm:text-3xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              One idea becomes three testable combinations.
            </h2>
            <h2 ref={text3Ref} className="absolute left-0 top-0 w-full px-4 text-2xl font-medium tracking-tight text-slate-900 opacity-0 sm:text-3xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Every element reveals what audiences prefer.
            </h2>
            <h2 ref={text4Ref} className="absolute left-0 top-0 w-full px-4 text-2xl font-medium tracking-tight text-slate-900 opacity-0 sm:text-3xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Winning elements recombine into the strongest design.
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
                height: metrics.scannerH,
                backgroundColor: BRAND_BLUE,
                boxShadow: `0 0 22px 3px rgba(${BRAND_BLUE_RGB}, 0.75)`,
              }}
            />

            {/* Packs — each a stack of 5 registered layers
                (bottle base + element + product + proposition + pump) */}
            {visibleDesigns.map((design, b) => {
              if (!layerRefs.current[b]) layerRefs.current[b] = []
              return (
                <div
                  key={design.key}
                  ref={(el) => {
                    if (el) bottleRefs.current[b] = el
                  }}
                  className="absolute left-1/2 top-1/2"
                  style={{ height: metrics.heroBox, width: metrics.heroBox }}
                >
                  {RENDER_ORDER.map((key, i) => (
                    <div
                      key={key}
                      ref={(el) => {
                        if (el) layerRefs.current[b][i] = el
                      }}
                      className="absolute inset-0 will-change-transform"
                      style={{ filter: layerFilter(key) }}
                    >
                      <Image
                        src={assetSrc(key, design[key])}
                        alt={key === "bottle" ? `${design.key} design` : ""}
                        fill
                        sizes="(max-width: 768px) 60vw, 360px"
                        className="object-contain"
                        priority={b === bestDisplay && key === "bottle"}
                      />
                    </div>
                  ))}
                </div>
              )
            })}

            {/* Stage-level mixed layers. Keeping these outside the transformed
                bottle wrappers guarantees every swapped element paints above
                its destination bottle, including the third design. */}
            {visibleDesigns.map((design, b) => (
              <div
                key={`mixed-${design.key}`}
                ref={(el) => {
                  if (el) mixedOverlayRefs.current[b] = el
                }}
                className="pointer-events-none absolute left-1/2 top-1/2 z-[25] opacity-0"
                style={{
                  height: metrics.heroBox,
                  width: metrics.heroBox,
                  transform: `translate(-50%, -50%) translateX(${metrics.positions[b]}px) scale(${metrics.packScale})`,
                }}
              >
                {RENDER_ORDER.filter((key) => key !== "bottle").map((key) => (
                  <div key={key} className="absolute inset-0" style={{ filter: layerFilter(key) }}>
                    <Image
                      src={assetSrc(key, mixedAsset(b, key))}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 40vw, 220px"
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
            ))}

            {/* Leader lines — thin connectors that clearly attach each element
                (dot end) to its callout label */}
            {metrics.explode.map((e, ci) => (
              <div
                key={`line-${e.bottleIndex}-${e.key}`}
                ref={(el) => {
                  if (el) calloutLineRefs.current[ci] = el
                }}
                className="pointer-events-none absolute left-1/2 top-1/2 z-20 opacity-0"
                style={{ transform: `translate(${e.visX}px, ${e.visY}px)` }}
              >
                {/* dot on the element */}
                <div className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500" />
                {/* connector to the label */}
                <div
                  className="absolute h-px bg-slate-400"
                  style={{ width: e.lineLen, transform: `rotate(${e.lineAngle}deg)`, transformOrigin: "0 50%" }}
                />
              </div>
            ))}

            {/* One callout for every component across all three designs */}
            {metrics.explode.map((e, ci) => {
              const c = calloutByKey(e.key, e.bottleIndex)
              return (
                <div
                  key={`label-${e.bottleIndex}-${e.key}`}
                  className="pointer-events-none absolute left-1/2 top-1/2 z-40"
                  style={{ transform: `translate(${e.labelX}px, ${e.labelY}px) translate(-50%, -50%)` }}
                >
                  <div
                    ref={(el) => {
                      if (el) calloutLabelRefs.current[ci] = el
                    }}
                    className="whitespace-nowrap rounded-md bg-white/95 px-1.5 py-1 text-center opacity-0 shadow-sm ring-1 ring-slate-100 sm:px-2"
                  >
                    {metrics.isMobile ? (
                      <div className="text-[7px] font-semibold uppercase leading-none tracking-[0.03em]" style={{ color: BRAND_BLUE }}>
                        {c.seg} {c.delta}
                      </div>
                    ) : (
                      <>
                        <div className="text-[8px] font-medium uppercase leading-none tracking-[0.12em] text-slate-400">
                          Liked by {c.seg}
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold leading-none" style={{ color: BRAND_BLUE }}>
                          {c.delta}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Winner badge (final phase) */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-40"
              style={{ transform: `translate(0px, ${Math.round(metrics.heroBox * 0.6)}px) translate(-50%, -50%)` }}
            >
              <div
                ref={winnerBadgeRef}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Best design
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spacer to prevent abrupt transition from pinned story */}
      <div className="relative z-0 h-56 w-full bg-white md:h-[35vh]"></div>

      {/* Design Configurator */}
      <div className="bg-slate-50/50 border-t border-slate-100">
        <LandingDesignConfigurator />
      </div>

      {/* Case Studies / Proof — temporarily hidden */}
      {/* <CaseStudies /> */}

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
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={LOGIN_HREF}
              className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-8 py-4 text-xl font-bold shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-gray-50 hover:shadow-2xl"
              style={{ color: BRAND_BLUE }}
            >
              Login / Create an account
              <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2} />
            </Link>
            <Link
              href={CONTACT_MAILTO}
              className="inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-white/80 bg-transparent px-8 py-4 text-xl font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#1A1A1A] py-8 text-center">
        <p className="text-sm text-gray-500">&copy; 2026 TikunTech. All Rights Reserved.</p>
      </footer>

    </div>
  )
}
