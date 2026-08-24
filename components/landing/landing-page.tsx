"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useState, useEffect, useLayoutEffect, useMemo } from "react"
import { ArrowRight, Check, Menu, X } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
// import { CaseStudies } from "./case-studies"
import { LandingContact } from "./landing-contact"
import { LandingDesignConfigurator } from "./landing-design-configurator"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
  // Mobile browser toolbars resize the visual viewport while the user scrolls.
  // Refreshing a long pinned timeline for those height-only changes can move
  // the document back into the pin, especially during a fast reverse swipe.
  ScrollTrigger.config({ ignoreMobileResize: true })
}

const LOGIN_HREF = "/login"
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

const DESIGNS: Design[] = [
  { key: "rosewood", bottle: "rosewood", element: "drop", product: "bodywash", proposition: "hydrates", pump: "A-light" },
  { key: "sage", bottle: "sage", element: "leaf", product: "moisturiser", proposition: "nourishes", pump: "A-light" },
  { key: "mink", bottle: "mink", element: "flame", product: "shampoo", proposition: "revives", pump: "A-light", isBest: true },
  { key: "periwinkle", bottle: "periwinkle", element: "ice", product: "deodorant", proposition: "freshens", pump: "A-light" },
  { key: "terracotta", bottle: "terracotta", element: "mineral", product: "handwash", proposition: "protects", pump: "A-light" },
]
/** All five candidates appear in the opening fan-out. */
const STORY_DESIGNS = DESIGNS
/** All five packs are shown during the coefficient callout phase. */
const COEFFICIENT_INDICES = STORY_DESIGNS.map((_, i) => i)

const CONFIG_BASE = "/landing-page/configurator"
const assetSrc = (type: LayerKey, name: string) => `/landing-page/story/${type}/${name}.webp`
const configuratorSrc = (type: LayerKey, name: string) => `${CONFIG_BASE}/${type}/${name}.webp`

const ELEMENT_COUNTS = { bottle: 21, element: 18, product: 5, proposition: 24, pump: 22 }
const FACTORIAL_TOTAL =
  ELEMENT_COUNTS.bottle *
  ELEMENT_COUNTS.element *
  ELEMENT_COUNTS.product *
  ELEMENT_COUNTS.proposition *
  ELEMENT_COUNTS.pump

const CLUSTER_PUMPS = [
  "A-light", "A-dark", "A-neutral", "B-light", "B-dark", "B-neutral",
  "C-light", "C-dark", "C-neutral", "D-light", "D-neutral", "E-light",
  "F-light", "F-neutral", "G-light", "G-dark",
]
const CLUSTER_BOTTLES = [
  "mink", "sage", "periwinkle", "rosewood", "terracotta", "blush",
  "teal", "mauve", "ivory", "slate", "honey", "khaki", "powder", "steel",
]
const CLUSTER_PRODUCTS = ["bodywash", "deodorant", "handwash", "moisturiser", "shampoo"]
const CLUSTER_PROPOSITIONS = [
  "hydrates", "nourishes", "freshens", "protects", "revives", "cleanses",
  "restores", "renews", "comforts", "regenerates", "soothes", "uplifts",
]
const CLUSTER_ELEMENTS = [
  "flame", "leaf", "ice", "drop", "mineral", "wind", "waves", "diamond",
  "shine", "splash", "branch", "gear", "hourglass", "leaves", "polaris",
]

/** Five testable layers — each category pops out from its matching product slot. */
const CLUSTER_CATEGORIES: { key: LayerKey; label: string; assets: string[] }[] = [
  { key: "pump", label: "Caps", assets: CLUSTER_PUMPS.slice(0, 8) },
  { key: "bottle", label: "Bottles", assets: CLUSTER_BOTTLES.slice(0, 8) },
  { key: "element", label: "Elements", assets: CLUSTER_ELEMENTS.slice(0, 8) },
  { key: "product", label: "Products", assets: CLUSTER_PRODUCTS },
  { key: "proposition", label: "Claims", assets: CLUSTER_PROPOSITIONS.slice(0, 8) },
]

type ClusterItemLayout = {
  category: LayerKey
  name: string
  label: string
  finalX: number
  finalY: number
  rotation: number
  originBottle: number
  size: number
}

/** Icons and printed labels read smaller than caps/bottles — scale them up in clusters. */
const CLUSTER_CATEGORY_SCALE: Partial<Record<LayerKey, number>> = {
  element: 1.45,
  product: 1.55,
  proposition: 1.55,
}

/** Radial clusters anchored to each of the five product positions (original pop-out layout). */
function computeClusterLayout(metrics: {
  isMobile: boolean
  positions: number[]
  heroBox: number
}): {
  layouts: ClusterItemLayout[]
  itemSize: number
  labelPositions: { x: number; y: number; label: string }[]
} {
  const { isMobile, positions, heroBox } = metrics
  const baseSize = Math.round(
    Math.max(isMobile ? 80 : 108, Math.min(isMobile ? 96 : 132, heroBox * (isMobile ? 0.4 : 0.38)))
  )
  const itemSize = baseSize
  const layouts: ClusterItemLayout[] = []

  const categoryCenters = isMobile
    ? CLUSTER_CATEGORIES.map(() => ({ x: 0, y: 0 }))
    : [
        { x: positions[0], y: -Math.round(heroBox * 0.1) },
        { x: positions[1], y: -Math.round(heroBox * 0.3) },
        { x: positions[2], y: Math.round(heroBox * 0.12) },
        { x: positions[3], y: -Math.round(heroBox * 0.3) },
        { x: positions[4], y: -Math.round(heroBox * 0.1) },
      ]

  const labelPositions = CLUSTER_CATEGORIES.map((cat, ci) => ({
    x: categoryCenters[ci].x,
    y: categoryCenters[ci].y - Math.round(isMobile ? itemSize * 0.95 : itemSize * 1.15),
    label: cat.label,
  }))

  CLUSTER_CATEGORIES.forEach((cat, ci) => {
    const center = categoryCenters[ci]
    const catScale = CLUSTER_CATEGORY_SCALE[cat.key] ?? 1
    const assetSize = Math.round(itemSize * catScale * (isMobile ? 0.82 : 1))
    cat.assets.forEach((name, i) => {
      const a = (i / cat.assets.length) * Math.PI * 2 - Math.PI / 2
      const r = assetSize * (isMobile ? 0.38 + (i % 4) * 0.12 : 0.48 + (i % 4) * 0.17)
      layouts.push({
        category: cat.key,
        name,
        label: cat.label,
        finalX: Math.round(center.x + Math.cos(a) * r),
        finalY: Math.round(center.y + Math.sin(a) * r * 0.88),
        rotation: (i % 6) * 6 - 15,
        originBottle: ci,
        size: assetSize,
      })
    })
  })

  return { layouts, itemSize, labelPositions }
}

function buildCarouselCombinations(): Design[] {
  const bottles = ["mink", "sage", "periwinkle", "blush", "teal", "mauve", "ivory", "slate", "rosewood", "terracotta"]
  const elements = ["flame", "leaf", "ice", "drop", "mineral", "wind", "waves", "diamond", "leaf", "shine"]
  const products = ["shampoo", "moisturiser", "deodorant", "bodywash", "handwash"]
  const propositions = ["revives", "nourishes", "freshens", "hydrates", "protects", "cleanses", "restores", "renews", "comforts", "regenerates"]
  const pumps = ["A-light", "B-neutral", "C-dark", "D-light", "E-neutral", "F-light", "G-dark", "A-dark", "B-light", "C-neutral"]

  const combos: Design[] = []
  const seen = new Set<string>()
  for (let i = 0; combos.length < 15 && i < 60; i++) {
    const bottle = bottles[i % bottles.length]
    const element = elements[(i * 2 + 1) % elements.length]
    const product = products[(i * 3) % products.length]
    const proposition = propositions[(i * 5 + 2) % propositions.length]
    const pump = pumps[(i * 7) % pumps.length]
    const key = `${bottle}-${element}-${product}-${proposition}-${pump}`
    if (seen.has(key)) continue
    seen.add(key)
    combos.push({ key, bottle, element, product, proposition, pump })
  }
  return combos
}

const CAROUSEL_COMBINATIONS = buildCarouselCombinations()

const SEGMENT_VARIANTS = [
  { key: "women", label: "Women", design: DESIGNS[3] },
  { key: "young", label: "Young people", design: DESIGNS[1] },
  { key: "eco", label: "Eco-conscious", design: DESIGNS[4] },
] as const

const HERO_INDEX = DESIGNS.findIndex((d) => d.isBest) // mink — the opening complete product

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
/** Mind Genomics appeal coefficients (not percentages). */
const COEFFICIENT_LABELS: Record<LayerKey, { seg: string; values: string[] }> = {
  element: { seg: "Gen Z", values: ["+0.12", "+0.22", "+0.11", "+0.09", "+0.08"] },
  product: { seg: "Millennials", values: ["+0.09", "+0.15", "+0.12", "+0.10", "+0.11"] },
  proposition: { seg: "Females", values: ["+0.13", "+0.17", "+0.08", "+0.14", "+0.10"] },
  pump: { seg: "Males", values: ["+0.10", "+0.12", "+0.07", "+0.09", "+0.11"] },
  bottle: { seg: "Overall", values: ["+0.12", "+0.19", "+0.10", "+0.15", "+0.11"] },
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
// Mobile has no leader lines, so each coefficient must remain beside the
// scattered artwork it describes instead of floating at the viewport edge.
const MOBILE_COEF_LABEL_OFFSET: Record<LayerKey, { x: number; y: number }> = {
  pump: { x: 0.18, y: 0.08 },
  product: { x: 0.13, y: -0.12 },
  element: { x: -0.14, y: 0.02 },
  proposition: { x: 0.13, y: 0.12 },
  bottle: { x: 0, y: 0.28 },
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
  const count = STORY_DESIGNS.length
  const pad = vw < 480 ? 12 : 24
  const availW = Math.min(vw - pad * 2, 1180)
  const half = availW / 2

  if (isMobile) {
    // Headline band ~ pt-14 + h-10 ≈ 96px; keep stage inside the remaining pin height
    // so absolute bottles are never clipped by the parent overflow.
    const mobileHead = 96
    const stageH = Math.max(340, Math.round(vh - mobileHead))
    const heroBox = Math.max(180, Math.round(Math.min(vw * 0.78, stageH * 0.68, 360)))
    const mobileStride = Math.round(vw * 0.88)
    const packScale = 1
    const packBox = heroBox
    // Lanes centred around 0 so product 0 is on-screen at the start of the fan-out
    const positions = Array.from({ length: count }, (_, i) => (i - Math.floor(count / 2)) * mobileStride)
    const carouselBox = Math.round(Math.min(vw * 0.72, heroBox * 0.9))
    const segmentBox = Math.round(Math.min(heroBox * 0.38, vw * 0.28))
    const compareShiftX = Math.round(availW * 0.22)
    // Account for the badge width as well as the viewport edge.
    const edgeSafe = half - 54
    const explode = Array.from({ length: count }, (_, bottleIndex) =>
      CALLOUT_KEYS.map((key) => {
        const s = SCATTER[key] ?? { x: 0, y: 0 }
        const c = CONTENT_CENTER[key]
        // Mobile scatters layers at 85% of the desktop distance (see timeline).
        // Use that same geometry here so coefficient badges track the artwork.
        const visX = Math.round((c.x + s.x * 0.85) * heroBox)
        const visY = Math.round((c.y + s.y * 0.85) * heroBox)
        const offset = MOBILE_COEF_LABEL_OFFSET[key]
        const rawLabelX = visX + offset.x * heroBox
        const labelX = Math.round(Math.max(-edgeSafe, Math.min(edgeSafe, rawLabelX)))
        const labelY = Math.round(visY + offset.y * heroBox)
        const dx = labelX - visX
        const dy = labelY - visY
        const lineLen = Math.round(Math.hypot(dx, dy))
        const lineAngle = (Math.atan2(dy, dx) * 180) / Math.PI
        return { bottleIndex, key, visX, visY, labelX, labelY, lineLen, lineAngle }
      })
    ).flat()
    const scannerH = Math.round(heroBox * 0.9)
    const scanReach = Math.round(heroBox * 0.42)
    const stageShift = 0

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
      carouselBox,
      segmentBox,
      compareShiftX,
      mobileStride,
      mobileHead,
    }
  }

  // Single hero pack (desktop).
  const heroByW = vw * 0.32
  const heroByH = vh * 0.46
  const heroMax = 360
  const heroBox = Math.round(Math.max(140, Math.min(heroByW, heroByH, heroMax)))

  const packByW = availW / (count * 1.22)
  const packByH = (vh * 0.34) / 1.15
  const packMax = 175
  let packBox = Math.round(Math.max(64, Math.min(packByW, packByH, packMax)))
  if (packBox > heroBox) packBox = heroBox
  const packScale = packBox / heroBox

  const step = Math.min((availW - packBox) / (count - 1), packBox * 1.38)
  const positions = Array.from({ length: count }, (_, i) => Math.round((i - (count - 1) / 2) * step))

  const carouselBox = Math.round(Math.max(56, Math.min(heroBox * 0.72, 150)))
  const segmentBox = Math.round(Math.max(52, Math.min(heroBox * 0.62, 130)))
  const compareShiftX = Math.round(availW * 0.28)

  const edgeSafe = half - 58
  const explode = positions.flatMap((baseX, bottleIndex) =>
    CALLOUT_KEYS.map((key) => {
      const s = SCATTER[key] ?? { x: 0, y: 0 }
      const c = CONTENT_CENTER[key]
      const visX = Math.round(baseX + (c.x + s.x) * packBox)
      const visY = Math.round((c.y + s.y) * packBox)
      const lp = LABEL_POS[key]
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
  const stageH = Math.round(heroBox * 1.88 + 48)
  const stageShift = 0

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
    carouselBox,
    segmentBox,
    compareShiftX,
    mobileStride: 0,
    mobileHead: 0,
  }
}

type StageMetrics = ReturnType<typeof computeStageMetrics>

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
  const [contactOpen, setContactOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [text, setText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [loopNum, setLoopNum] = useState(0)
  const [typingSpeed, setTypingSpeed] = useState(150)

  // Live viewport → drives fully dynamic bottle sizing. Gate GSAP until the
  // real size is known so mobile never builds a desktop timeline first.
  const [viewport, setViewport] = useState({ w: 1280, h: 800 })
  const [viewportReady, setViewportReady] = useState(false)

  useLayoutEffect(() => {
    const measure = (force = false) => {
      const w = window.innerWidth
      const h = window.innerHeight
      setViewport((prev) => {
        const widthChanged = Math.abs(prev.w - w) >= 24
        const staysMobile = prev.w < 768 && w < 768

        // On phones, the address bar appearing/disappearing changes only the
        // height. Keep the original story geometry so ScrollTrigger does not
        // recalculate the pin in the middle of a swipe.
        if (!force && staysMobile && !widthChanged) return prev
        if (!force && !widthChanged && Math.abs(prev.h - h) < 40) return prev

        return { w, h }
      })
      setViewportReady(true)
    }
    measure(true)
    let raf = 0
    const scheduleMeasure = (force = false) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        measure(force)
      })
    }
    const onResize = () => scheduleMeasure(false)
    const onOrientationChange = () => scheduleMeasure(true)
    window.addEventListener("resize", onResize)
    window.addEventListener("orientationchange", onOrientationChange)
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("orientationchange", onOrientationChange)
      cancelAnimationFrame(raf)
    }
  }, [])

  const metrics = useMemo(() => computeStageMetrics(viewport.w, viewport.h), [viewport])
  const clusterLayout = useMemo(() => computeClusterLayout(metrics), [metrics])
  // Keep refs in sync during render so GSAP never reads a stale desktop metrics
  // object on the first mobile frame.
  const metricsRef = useRef(metrics)
  const clusterLayoutRef = useRef(clusterLayout)
  metricsRef.current = metrics
  clusterLayoutRef.current = clusterLayout

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
  const text5Ref = useRef<HTMLHeadingElement>(null)
  const text6Ref = useRef<HTMLHeadingElement>(null)

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

  const count = metrics.count
  const visibleDesigns = STORY_DESIGNS
  const heroIndex = HERO_INDEX
  const bestDisplay = heroIndex

  const calloutByKey = (key: LayerKey, bottleIndex: number) => ({
    seg: COEFFICIENT_LABELS[key].seg,
    coef: COEFFICIENT_LABELS[key].values[bottleIndex],
  })

  // Object refs
  const bottleRefs = useRef<HTMLDivElement[]>([])
  const layerRefs = useRef<HTMLDivElement[][]>([])
  const mixedOverlayRefs = useRef<HTMLDivElement[]>([])
  const calloutLabelRefs = useRef<HTMLDivElement[]>([])
  const calloutLineRefs = useRef<HTMLDivElement[]>([])
  const scannerRef = useRef<HTMLDivElement>(null)
  const winnerBadgeRef = useRef<HTMLDivElement>(null)
  const clusterRef = useRef<HTMLDivElement>(null)
  const clusterItemRefs = useRef<HTMLDivElement[]>([])
  const clusterLabelRefs = useRef<HTMLDivElement[]>([])
  const carouselRef = useRef<HTMLDivElement>(null)
  const carouselTrackRef = useRef<HTMLDivElement>(null)
  const factorialRef = useRef<HTMLDivElement>(null)
  const compareRef = useRef<HTMLDivElement>(null)
  const originalBottleRef = useRef<HTMLDivElement>(null)
  const segmentBottleRefs = useRef<HTMLDivElement[]>([])

  useGSAP(() => {
    if (!wrapperRef.current || !viewportReady) return

    const scrollConfig = {
      trigger: wrapperRef.current,
      start: "top top",
      end: () => (m().isMobile ? "+=1250%" : "+=820%"),
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      refreshPriority: 2,
      invalidateOnRefresh: true,
    }

    const mobileStory = metrics.isMobile
    const storyHeadings = [
      text1Ref.current,
      text2Ref.current,
      text3Ref.current,
      text4Ref.current,
      text5Ref.current,
      text6Ref.current,
    ]

    const m = () => metricsRef.current
    const cl = () => clusterLayoutRef.current
    const hero = heroIndex
    const start = hero
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
          autoAlpha: b === start ? 1 : 0,
          scale: b === start ? 1 : m().packScale * 0.7,
          filter: "drop-shadow(0 18px 30px rgba(15, 23, 42, 0.10))",
        })
        layerRefs.current[b]?.forEach((layer) => {
          if (layer) gsap.set(layer, { x: 0, y: 0, rotation: 0, opacity: 1 })
        })
      })
      gsap.set(calloutLabelRefs.current, { autoAlpha: 0, scale: 0.85 })
      gsap.set(calloutLineRefs.current, { autoAlpha: 0 })
      gsap.set(mixedOverlayRefs.current, { autoAlpha: 0 })
      gsap.set(winnerBadgeRef.current, { autoAlpha: 0, y: 12, scale: 0.9 })
      gsap.set(scannerRef.current, { autoAlpha: 0, x: () => -m().scanReach })
      gsap.set(clusterRef.current, { autoAlpha: 0 })
      clusterItemRefs.current.forEach((el, i) => {
        if (!el) return
        const layout = cl().layouts[i]
        if (!layout) return
        gsap.set(el, {
          xPercent: -50,
          yPercent: -50,
          x: () => (m().isMobile ? 0 : m().positions[layout.originBottle]),
          y: 0,
          autoAlpha: 0,
          scale: 0.12,
          rotation: 0,
        })
      })
      gsap.set(clusterLabelRefs.current, { autoAlpha: 0, y: 10, scale: 0.92 })
      gsap.set(carouselRef.current, { autoAlpha: 0 })
      gsap.set(factorialRef.current, { autoAlpha: 0, y: 10 })
      gsap.set(carouselTrackRef.current, { x: 0 })
      gsap.set(compareRef.current, { autoAlpha: 0 })
      gsap.set(originalBottleRef.current, { autoAlpha: 0, scale: 0.9 })
      gsap.set(segmentBottleRefs.current, { autoAlpha: 0, scale: 0.85, y: 8 })
      gsap.set(text1Ref.current, { autoAlpha: 1, y: 0 })
      storyHeadings.slice(1).forEach((el) => {
        if (el) gsap.set(el, { autoAlpha: 0, y: 0 })
      })

      // ── Phase 1 → 2 ──
      tl.to(text1Ref.current, { autoAlpha: 0, y: -12, duration: 0.55 })
        .to(text2Ref.current, { autoAlpha: 1, y: 0, duration: 0.55 }, ">-0.1")

      if (mobileStory) {
        // Mobile: one large centred pack at a time — slide through all five ideas.
        // (A multi-pack row was getting clipped / left off-screen on narrow viewports.)
        tl.addLabel("multiCarousel", "+=0.1")
        for (let i = 0; i < total; i++) {
          const at = i === 0 ? "multiCarousel" : `multiCarousel+=${i * 0.55}`
          if (i === 0) {
            if (start !== 0) {
              tl.to(
                bottleRefs.current[start],
                { autoAlpha: 0, x: () => -m().mobileStride * 0.55, duration: 0.35, ease: "power2.in" },
                at
              )
              tl.fromTo(
                bottleRefs.current[0],
                { autoAlpha: 1, x: () => m().mobileStride * 0.55, scale: 1 },
                { x: 0, duration: 0.4, ease: "power2.out", immediateRender: false },
                at
              )
            } else {
              tl.set(bottleRefs.current[0], { autoAlpha: 1, x: 0, scale: 1 }, at)
            }
          } else {
            tl.to(
              bottleRefs.current[i - 1],
              { autoAlpha: 0, x: () => -m().mobileStride * 0.55, duration: 0.35, ease: "power2.in" },
              at
            )
            tl.fromTo(
              bottleRefs.current[i],
              { autoAlpha: 1, x: () => m().mobileStride * 0.55, scale: 1 },
              { x: 0, duration: 0.4, ease: "power2.out", immediateRender: false },
              at
            )
          }
        }

        // ── Phase 2 → 3 : one category pops per scroll segment ──
        tl.to(text2Ref.current, { autoAlpha: 0, y: -12, duration: 0.55 }, "+=0.25")
          .to(text3Ref.current, { autoAlpha: 1, y: 0, duration: 0.55 }, ">-0.1")
          .addLabel("clusters")
          .set(carouselRef.current, { autoAlpha: 0 }, "clusters")
          .set(factorialRef.current, { autoAlpha: 0 }, "clusters")
          .set(carouselTrackRef.current, { x: 0 }, "clusters")
          .to(bottleRefs.current, { autoAlpha: 0, duration: 0.3 }, "clusters")
          .to(clusterRef.current, { autoAlpha: 1, duration: 0.2 }, "clusters")

        CLUSTER_CATEGORIES.forEach((_, ci) => {
          const catAt = `clusters+=${ci * 0.72}`
          tl.set(bottleRefs.current, { autoAlpha: 0, x: 0 }, catAt)
          tl.to(bottleRefs.current[ci], { autoAlpha: 0.35, x: 0, scale: 1, duration: 0.25 }, catAt)
          const label = clusterLabelRefs.current[ci]
          if (label) tl.to(label, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.5)" }, catAt)
          clusterItemRefs.current.forEach((el, i) => {
            const layout = cl().layouts[i]
            if (!el || !layout || layout.originBottle !== ci) return
            tl.fromTo(
              el,
              { x: 0, y: 0, autoAlpha: 0, scale: 0.12, rotation: 0 },
              {
                x: () => layout.finalX,
                y: () => layout.finalY,
                autoAlpha: 1,
                scale: 1,
                rotation: layout.rotation,
                duration: 0.48,
                ease: "back.out(2.2)",
              },
              `${catAt}+=0.06`
            )
          })
          if (ci < CLUSTER_CATEGORIES.length - 1) {
            const hideAt = `clusters+=${(ci + 1) * 0.72 - 0.06}`
            tl.to(
              clusterItemRefs.current.filter((_, i) => cl().layouts[i]?.originBottle === ci),
              { autoAlpha: 0, scale: 0.85, duration: 0.22 },
              hideAt
            )
            if (label) tl.to(label, { autoAlpha: 0, duration: 0.18 }, hideAt)
          }
        })
        tl.to(bottleRefs.current, { autoAlpha: 0, duration: 0.35 }, "clusters+=3.55")

        // ── Phase 3 → 4 : carousel ──
        tl.to(text3Ref.current, { autoAlpha: 0, y: -12, duration: 0.55 }, "+=0.35")
          .to(text4Ref.current, { autoAlpha: 1, y: 0, duration: 0.55 }, ">-0.1")
          .to(clusterItemRefs.current, { autoAlpha: 0, duration: 0.25 }, "<0.05")
          .to(clusterLabelRefs.current, { autoAlpha: 0, duration: 0.2 }, "<")
          .to(clusterRef.current, { autoAlpha: 0, duration: 0.25 }, "<")
          .to(carouselRef.current, { autoAlpha: 1, duration: 0.45 }, "<0.1")
          .set(factorialRef.current, { autoAlpha: 0, y: 10 }, "<0.1")
          .addLabel("carousel")
          .to(
            carouselTrackRef.current,
            {
              x: () => {
                const gap = m().carouselBox * 0.14
                const stride = m().carouselBox + gap
                return -(stride * (CAROUSEL_COMBINATIONS.length - 1))
              },
              duration: 3.2,
              ease: "none",
            },
            "carousel"
          )
          .to(factorialRef.current, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" }, "carousel+=1.4")

        // ── Phase 4 → 5 : one product at a time — layers + coefficients ──
        tl.to(text4Ref.current, { autoAlpha: 0, y: -12, duration: 0.55 }, "+=0.3")
          .to(text5Ref.current, { autoAlpha: 1, y: 0, duration: 0.55 }, ">-0.1")
          .to(carouselRef.current, { autoAlpha: 0, duration: 0.35 }, "<0.05")
          .to(factorialRef.current, { autoAlpha: 0, duration: 0.25 }, "<")
          .set(carouselTrackRef.current, { x: 0 }, "<")
          .addLabel("coef")
          .set(bottleRefs.current, { autoAlpha: 0, x: 0 }, "coef")
          .set(bottleRefs.current[0], { autoAlpha: 1, x: 0, scale: 1 }, "coef")

        COEFFICIENT_INDICES.forEach((b, bi) => {
          const block = 1.35
          const at = bi === 0 ? "coef" : `coef+=${bi * block}`

          tl.to(calloutLabelRefs.current, { autoAlpha: 0, scale: 0.85, duration: 0.15 }, at)
          tl.to(calloutLineRefs.current, { autoAlpha: 0, duration: 0.15 }, at)
          bottleRefs.current.forEach((el, i) => {
            if (!el) return
            scatterKeys.forEach((key) => {
              const layer = layerOf(i, key)
              if (layer) tl.set(layer, { x: 0, y: 0, rotation: 0, opacity: 1 }, at)
            })
          })

          if (bi > 0) {
            tl.to(
              bottleRefs.current[bi - 1],
              {
                x: () => -m().mobileStride * 0.55,
                autoAlpha: 0,
                duration: 0.35,
                ease: "power2.in",
              },
              at
            )
            tl.fromTo(
              bottleRefs.current[b],
              { x: () => m().mobileStride * 0.55, autoAlpha: 1, scale: 1 },
              { x: 0, duration: 0.4, ease: "power2.out", immediateRender: false },
              at
            )
          } else {
            tl.set(bottleRefs.current[b], { x: 0, autoAlpha: 1, scale: 1 }, at)
          }

          scatterKeys.forEach((key) => {
            const layer = layerOf(b, key)
            const s = SCATTER[key]
            if (!layer || !s) return
            tl.to(
              layer,
              {
                x: () => s.x * m().heroBox * 0.85,
                y: () => s.y * m().heroBox * 0.85,
                rotation: s.r,
                duration: 0.48,
                ease: "power2.out",
              },
              `${at}+=0.12`
            )
          })

          metrics.explode.forEach((e, ci) => {
            if (e.bottleIndex !== b) return
            const label = calloutLabelRefs.current[ci]
            if (label) tl.to(label, { autoAlpha: 1, scale: 1, duration: 0.28, ease: "back.out(1.35)" }, `${at}+=0.42`)
          })

          if (bi < COEFFICIENT_INDICES.length - 1) {
            tl.to(calloutLabelRefs.current, { autoAlpha: 0, scale: 0.85, duration: 0.18 }, `${at}+=0.88`)
          }
        })
      } else {
        // Desktop: multi-up row, radial clusters, all-five coefficient scan
        tl.to(
          bottleRefs.current[start],
          { x: () => m().positions[start], scale: () => m().packScale, duration: 1.2, ease: "power3.inOut" },
          "<0.1"
        )
        bottleRefs.current.forEach((el, b) => {
          if (b === start || !el) return
          tl.fromTo(
            el,
            { autoAlpha: 0, x: 0, scale: () => m().packScale * 0.7 },
            { autoAlpha: 1, x: () => m().positions[b], scale: () => m().packScale, duration: 1.1, ease: "power3.out" },
            `<${0.05 + Math.abs(b - start) * 0.05}`
          )
        })

        tl.to(text2Ref.current, { autoAlpha: 0, y: -20, duration: 0.65 }, "+=0.35")
          .to(text3Ref.current, { autoAlpha: 1, y: 0, duration: 0.65 }, ">-0.1")
          .addLabel("clusters")
          .to(bottleRefs.current, { autoAlpha: 0.4, duration: 0.35, ease: "power2.out" }, "clusters")
          .to(clusterRef.current, { autoAlpha: 1, duration: 0.2 }, "clusters")

        clusterItemRefs.current.forEach((el, i) => {
          if (!el) return
          const layout = cl().layouts[i]
          if (!layout) return
          const catIndex = layout.originBottle
          tl.to(
            el,
            {
              x: () => cl().layouts[i]?.finalX ?? 0,
              y: () => cl().layouts[i]?.finalY ?? 0,
              autoAlpha: 1,
              scale: 1,
              rotation: () => cl().layouts[i]?.rotation ?? 0,
              duration: 0.62,
              ease: "back.out(2.4)",
            },
            `clusters+=${0.06 + catIndex * 0.1 + (i % 8) * 0.028}`
          )
        })

        cl().labelPositions.forEach((_, ci) => {
          const label = clusterLabelRefs.current[ci]
          if (!label) return
          tl.to(label, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, `clusters+=${0.28 + ci * 0.09}`)
        })

        tl.to(bottleRefs.current, { autoAlpha: 0, duration: 0.5, ease: "power2.in" }, "clusters+=0.35")

        tl.to(text3Ref.current, { autoAlpha: 0, y: -20, duration: 0.65 }, "+=0.5")
          .to(text4Ref.current, { autoAlpha: 1, y: 0, duration: 0.65 }, ">-0.1")
          .to(clusterItemRefs.current, { autoAlpha: 0, scale: 0.85, duration: 0.35, ease: "power2.in" }, "<0.05")
          .to(clusterLabelRefs.current, { autoAlpha: 0, duration: 0.3 }, "<")
          .to(clusterRef.current, { autoAlpha: 0, duration: 0.35 }, "<")
          .to(carouselRef.current, { autoAlpha: 1, duration: 0.5 }, "<0.1")
          .addLabel("carousel")
          .to(
            carouselTrackRef.current,
            {
              x: () => {
                const gap = m().carouselBox * 0.22
                const stride = m().carouselBox + gap
                return -(stride * (CAROUSEL_COMBINATIONS.length - 3))
              },
              duration: 2.8,
              ease: "none",
            },
            "carousel"
          )
          .to(factorialRef.current, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, "carousel+=1.2")

        tl.to(text4Ref.current, { autoAlpha: 0, y: -20, duration: 0.65 }, "+=0.35")
          .to(text5Ref.current, { autoAlpha: 1, y: 0, duration: 0.65 }, ">-0.1")
          .to(carouselRef.current, { autoAlpha: 0, duration: 0.45 }, "<0.05")
          .to(factorialRef.current, { autoAlpha: 0, duration: 0.35 }, "<")

        tl.addLabel("coefPrep")
        bottleRefs.current.forEach((el, b) => {
          if (!el) return
          tl.set(el, { x: () => m().positions[b], scale: () => m().packScale, autoAlpha: 1 }, "coefPrep")
          layerRefs.current[b]?.forEach((layer) => {
            if (layer) tl.set(layer, { x: 0, y: 0, rotation: 0, opacity: 1 }, "coefPrep")
          })
        })

        tl.addLabel("scan")
          .to(scannerRef.current, { autoAlpha: 1, duration: 0.3 }, "scan")
          .fromTo(
            scannerRef.current,
            { x: () => -m().scanReach },
            { x: () => m().scanReach, duration: 2.9, ease: "none" },
            "scan"
          )

        const coefTotal = COEFFICIENT_INDICES.length
        const spanStep = coefTotal > 1 ? 2.1 / (coefTotal - 1) : 0
        COEFFICIENT_INDICES.forEach((b, bi) => {
          const at = `scan+=${0.3 + bi * spanStep}`
          scatterKeys.forEach((key) => {
            const layer = layerOf(b, key)
            const s = SCATTER[key]
            if (!layer || !s) return
            tl.to(
              layer,
              { x: () => s.x * m().heroBox, y: () => s.y * m().heroBox, rotation: s.r, duration: 0.85, ease: "power2.out" },
              at
            )
          })
        })

        calloutLabelRefs.current.forEach((_, ci) => {
          const e = metrics.explode[ci]
          if (!e) return
          const line = calloutLineRefs.current[ci]
          const label = calloutLabelRefs.current[ci]
          if (line) tl.to(line, { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, `scan+=${2.15 + ci * 0.012}`)
          if (label) tl.to(label, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(1.35)" }, `scan+=${2.18 + ci * 0.012}`)
        })

        tl.to(scannerRef.current, { autoAlpha: 0, duration: 0.3 }, "scan+=2.9")
      }

      // ── Phase 5 → 6 : original vs segment-optimised combinations ──
      if (mobileStory) {
        tl.to(text5Ref.current, { autoAlpha: 0, y: -12, duration: 0.55 }, "+=0.35")
          .to(text6Ref.current, { autoAlpha: 1, y: 0, duration: 0.55 }, ">-0.1")
          .addLabel("compare")

        tl.to(calloutLabelRefs.current, { autoAlpha: 0, scale: 0.85, duration: 0.25 }, "compare")
          .to(carouselRef.current, { autoAlpha: 0, duration: 0.2 }, "compare")
          .to(factorialRef.current, { autoAlpha: 0, duration: 0.2 }, "compare")
          .to(bottleRefs.current, { autoAlpha: 0, duration: 0.35 }, "compare")
      } else {
        tl.to(text5Ref.current, { autoAlpha: 0, y: -20, duration: 0.65 }, "+=0.45")
          .to(text6Ref.current, { autoAlpha: 1, y: 0, duration: 0.65 }, ">-0.1")
          .addLabel("compare")

        tl.to(calloutLabelRefs.current, { autoAlpha: 0, scale: 0.85, duration: 0.35 }, "compare")
          .to(calloutLineRefs.current, { autoAlpha: 0, duration: 0.35 }, "compare")
          .to(bottleRefs.current, { autoAlpha: 0, duration: 0.45 }, "compare")
          .to(scannerRef.current, { autoAlpha: 0, duration: 0.2 }, "compare")
      }

      bottleRefs.current.forEach((el, b) => {
        if (!el) return
        scatterKeys.forEach((key) => {
          const layer = layerOf(b, key)
          if (layer) tl.to(layer, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: "power2.inOut" }, "compare")
        })
      })

      tl.to(compareRef.current, { autoAlpha: 1, duration: 0.5 }, "compare+=0.25")
        .to(
          originalBottleRef.current,
          { autoAlpha: 1, scale: 1, duration: 0.65, ease: "back.out(1.2)" },
          "compare+=0.35"
        )

      segmentBottleRefs.current.forEach((el, i) => {
        if (!el) return
        tl.to(el, { autoAlpha: 1, scale: 1, y: 0, duration: 0.55, ease: "back.out(1.25)" }, `compare+=${0.45 + i * 0.12}`)
      })

      tl.to(
        originalBottleRef.current,
        {
          filter: `drop-shadow(0 24px 44px rgba(${BRAND_BLUE_RGB}, 0.22))`,
          duration: 0.8,
          ease: "power2.out",
        },
        "compare+=1.1"
      )

      return tl
    }

    const tl = buildStoryTimeline()
    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, { scope: wrapperRef, dependencies: [count, viewportReady ? (viewport.w < 768 ? 1 : 2) : 0] })

  // On viewport change: ask ScrollTrigger to recompute function-based values.
  useEffect(() => {
    if (!viewportReady) return
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [metrics, clusterLayout])

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
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white px-8 text-sm font-medium text-gray-800 transition-all hover:bg-gray-50"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Pinned Scroll Story */}
      <section id="story" ref={wrapperRef} className="relative z-30 w-full bg-white">
        <div ref={containerRef} className="flex h-[100dvh] w-full flex-col overflow-x-hidden overflow-y-hidden">

          {/* Headline — fixed slot so titles never overlap the stage */}
          <div className="relative z-20 shrink-0 px-3 pt-14 pb-1 sm:px-4 sm:pt-[12%] sm:pb-0">
            <div className="relative mx-auto h-11 w-full max-w-3xl sm:h-20 md:h-24">
              <h2
                ref={text1Ref}
                className="absolute inset-0 flex items-center justify-center px-1 text-center text-[15px] font-medium leading-tight tracking-tight text-slate-900 sm:px-2 sm:text-3xl md:text-5xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                How is a winning design built?
              </h2>
              <h2
                ref={text2Ref}
                className="absolute inset-0 flex items-center justify-center px-1 text-center text-[15px] font-medium leading-tight tracking-tight text-slate-900 opacity-0 invisible sm:px-2 sm:text-3xl md:text-5xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                One product, but multiple ideas.
              </h2>
              <h2
                ref={text3Ref}
                className="absolute inset-0 flex items-center justify-center px-1 text-center text-[15px] font-medium leading-tight tracking-tight text-slate-900 opacity-0 invisible sm:px-2 sm:text-3xl md:text-5xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                Breaking down the product into its components.
              </h2>
              <h2
                ref={text4Ref}
                className="absolute inset-0 flex items-center justify-center px-1 text-center text-[15px] font-medium leading-tight tracking-tight text-slate-900 opacity-0 invisible sm:px-2 sm:text-3xl md:text-5xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                Countless combinations can be made.
              </h2>
              <h2
                ref={text5Ref}
                className="absolute inset-0 flex items-center justify-center px-1 text-center text-[15px] font-medium leading-tight tracking-tight text-slate-900 opacity-0 invisible sm:px-2 sm:text-3xl md:text-5xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                Every element reveals its appeal coefficient.
              </h2>
              <h2
                ref={text6Ref}
                className="absolute inset-0 flex items-center justify-center px-1 text-center text-[15px] font-medium leading-tight tracking-tight text-slate-900 opacity-0 invisible sm:px-2 sm:text-3xl md:text-5xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                Stronger combinations for every audience.
              </h2>
            </div>
          </div>

          {/* Stage — flex-1 fills leftover pin height; minHeight keeps bottles on-screen on mobile */}
          <div
            id="bottle-stage"
            className="relative z-10 mx-auto w-full max-w-6xl flex-1 min-h-0"
            style={
              metrics.isMobile
                ? { minHeight: metrics.heroBox + 48 }
                : { height: metrics.stageH, transform: `translateY(${metrics.stageShift}px)` }
            }
          >
            {/* Scanner Line */}
            <div
              ref={scannerRef}
              className="absolute left-1/2 top-1/2 z-30 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full max-md:hidden"
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
                  className={`absolute left-1/2 top-1/2 ${
                    b === heroIndex ? "opacity-100" : "opacity-0"
                  }`}
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
                        sizes="(max-width: 768px) 86vw, 360px"
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

            {/* Component clusters — five radial bursts popping from each product */}
            <div
              ref={clusterRef}
              className="pointer-events-none absolute inset-0 z-[15] opacity-0"
            >
              {clusterLayout.labelPositions.map((lp, ci) => (
                <div
                  key={lp.label}
                  className="absolute left-1/2 top-1/2 z-10"
                  style={{ transform: `translate(${lp.x}px, ${lp.y}px) translate(-50%, -50%)` }}
                >
                  <div
                    ref={(el) => {
                      if (el) clusterLabelRefs.current[ci] = el
                    }}
                    className="whitespace-nowrap rounded-full bg-white/90 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 opacity-0 shadow-sm ring-1 ring-slate-100 sm:px-3 sm:py-1 sm:text-[10px]"
                  >
                    {lp.label}
                  </div>
                </div>
              ))}

              {clusterLayout.layouts.map((item, i) => (
                <div
                  key={`${item.category}-${item.name}-${i}`}
                  ref={(el) => {
                    if (el) clusterItemRefs.current[i] = el
                  }}
                  className="absolute left-1/2 top-1/2 will-change-transform opacity-0"
                  style={{
                    width: item.size,
                    height: item.size,
                  }}
                >
                  <Image
                    src={configuratorSrc(item.category, item.name)}
                    alt=""
                    fill
                    sizes="140px"
                    className="object-contain"
                    style={{ filter: layerFilter(item.category) }}
                  />
                </div>
              ))}
            </div>

            {/* Carousel of 15 unique combinations */}
            <div
              ref={carouselRef}
              className="pointer-events-none absolute inset-0 z-[18] flex items-center justify-center opacity-0 max-md:px-1"
            >
              <div className="relative w-full overflow-hidden" style={{ maxWidth: metrics.isMobile ? metrics.carouselBox + 32 : 720 }}>
                <div
                  ref={carouselTrackRef}
                  className="flex items-center will-change-transform"
                  style={{ gap: Math.round(metrics.carouselBox * (metrics.isMobile ? 0.12 : 0.22)) }}
                >
                  {CAROUSEL_COMBINATIONS.map((design) => (
                    <div
                      key={design.key}
                      className="relative shrink-0"
                      style={{ width: metrics.carouselBox, height: metrics.carouselBox }}
                    >
                      {RENDER_ORDER.map((key) => (
                        <div key={key} className="absolute inset-0" style={{ filter: layerFilter(key) }}>
                          <Image
                            src={configuratorSrc(key, design[key])}
                            alt=""
                            fill
                            sizes="150px"
                            className="object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={factorialRef}
              className="pointer-events-none absolute bottom-2 left-0 right-0 z-[19] text-center opacity-0 max-md:bottom-3 sm:bottom-6"
            >
              <p className="text-sm font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {FACTORIAL_TOTAL.toLocaleString()}
                <span className="text-slate-500"> possible combinations</span>
              </p>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-slate-400 sm:mt-1 sm:text-xs">
                {ELEMENT_COUNTS.bottle} bottles × {ELEMENT_COUNTS.element} elements × {ELEMENT_COUNTS.product} products × {ELEMENT_COUNTS.proposition} claims × {ELEMENT_COUNTS.pump} caps
              </p>
            </div>

            {/* Original vs segment-optimised combinations */}
            <div
              ref={compareRef}
              className="pointer-events-none absolute inset-0 z-[22] flex items-center justify-center opacity-0 px-3"
            >
              <div className="flex w-full max-w-lg flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:gap-10">
                <div className="flex flex-col items-center">
                  <div
                    ref={originalBottleRef}
                    className="relative opacity-0"
                    style={{
                      width: metrics.isMobile ? metrics.heroBox * 0.48 : metrics.heroBox * 0.78,
                      height: metrics.isMobile ? metrics.heroBox * 0.48 : metrics.heroBox * 0.78,
                    }}
                  >
                    {RENDER_ORDER.map((key) => (
                      <div key={key} className="absolute inset-0" style={{ filter: layerFilter(key) }}>
                        <Image
                          src={assetSrc(key, DESIGNS[heroIndex][key])}
                          alt=""
                          fill
                          sizes="280px"
                          className="object-contain"
                        />
                      </div>
                    ))}
                  </div>
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:mt-2 sm:text-xs">
                    Original
                  </span>
                </div>

                <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-col sm:gap-4">
                  {SEGMENT_VARIANTS.map((segment, i) => (
                    <div key={segment.key} className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
                      <div
                        ref={(el) => {
                          if (el) segmentBottleRefs.current[i] = el
                        }}
                        className="relative opacity-0"
                        style={{ width: metrics.segmentBox, height: metrics.segmentBox }}
                      >
                        {RENDER_ORDER.map((key) => (
                          <div key={key} className="absolute inset-0" style={{ filter: layerFilter(key) }}>
                            <Image
                              src={assetSrc(key, segment.design[key])}
                              alt=""
                              fill
                              sizes="130px"
                              className="object-contain"
                            />
                          </div>
                        ))}
                      </div>
                      <span className="max-w-[72px] text-center text-[8px] font-semibold uppercase leading-tight tracking-[0.06em] text-[#1a5f96] sm:text-left sm:text-[10px] sm:tracking-[0.12em]">
                        {segment.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Leader lines — thin connectors that clearly attach each element
                (dot end) to its callout label */}
            {metrics.explode.map((e, ci) => (
              <div
                key={`line-${e.bottleIndex}-${e.key}`}
                ref={(el) => {
                  if (el) calloutLineRefs.current[ci] = el
                }}
                className="pointer-events-none absolute left-1/2 top-1/2 z-20 opacity-0 max-md:hidden"
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
                        {c.coef} · {c.seg}
                      </div>
                    ) : (
                      <>
                        <div className="text-[8px] font-medium uppercase leading-none tracking-[0.12em] text-slate-400">
                          Coefficient
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold leading-none" style={{ color: BRAND_BLUE }}>
                          {c.coef}
                        </div>
                        <div className="mt-0.5 text-[7px] font-medium uppercase tracking-[0.08em] text-slate-400">
                          {c.seg}
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
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-white/80 bg-transparent px-8 py-4 text-xl font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#1A1A1A] py-8 text-center">
        <p className="text-sm text-gray-500">&copy; 2026 TikunTech. All Rights Reserved.</p>
      </footer>

      <LandingContact open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  )
}
