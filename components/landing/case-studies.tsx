"use client"

import { useRef, useCallback } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { CaseStudyCard, type CaseStudyData } from "./case-study-card"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

const CASE_STUDIES: CaseStudyData[] = [
  {
    category: "Healthcare",
    title: "Improving Patient Engagement",
    description: "MindSurve identified the hidden decision drivers that increased patient participation and adherence to long-term treatment plans by uncovering the exact messaging cues that build trust.",
    result: "+22%",
    resultLabel: "Engagement lift",
  },
  {
    category: "Retail",
    title: "Optimising Store Layouts",
    description: "Discovered the subconscious navigation patterns of high-value shoppers to maximise product discovery and reduce time-to-purchase across 140 store locations.",
    result: "+15%",
    resultLabel: "Conversion rate",
  },
  {
    category: "Consumer Goods",
    title: "Predicting Flavour Trends",
    description: "Mapped sensory preferences to predict the next breakout beverage flavour 9 months before physical prototyping began — saving the brand from an $800K misallocation.",
    result: "$1.2M",
    resultLabel: "Revenue protected",
  },
  {
    category: "Education",
    title: "Personalising Learning Paths",
    description: "Identified the cognitive friction points in digital learning environments and tailored content delivery to match the mental models of different learner segments.",
    result: "40%",
    resultLabel: "Higher completion",
  },
  {
    category: "Financial Services",
    title: "Building Trust in Wealth Tech",
    description: "Uncovered the specific messaging cues that signal security and competence to new retail investors — driving a dramatic increase in first-time account opens.",
    result: "3×",
    resultLabel: "Account opens",
  },
]

const GAP_PX = 40

export function CaseStudies() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef   = useRef<HTMLDivElement>(null)

  // Drive per-card active/inactive styles via GSAP (no React re-render needed)
  const animateCard = useCallback((cardEl: HTMLElement, isActive: boolean) => {
    const accent = cardEl.querySelector<HTMLElement>(".case-study-accent")

    if (isActive) {
      gsap.to(cardEl, { scale: 1, opacity: 1, boxShadow: "0 20px 60px -12px rgba(0,0,0,0.16), 0 6px 20px rgba(0,0,0,0.07)", duration: 0.5, ease: "power3.out", overwrite: "auto" })
      if (accent) gsap.to(accent, { width: "100%", duration: 0.55, ease: "power2.inOut", overwrite: "auto" })
    } else {
      gsap.to(cardEl, { scale: 0.94, opacity: 0.5, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", duration: 0.4, ease: "power2.out", overwrite: "auto" })
      if (accent) gsap.to(accent, { width: "0%",   duration: 0.35, ease: "power2.inOut", overwrite: "auto" })
    }
  }, [])

  useGSAP(() => {
    if (!sectionRef.current || !trackRef.current) return

    const section = sectionRef.current
    const track   = trackRef.current
    const wraps   = gsap.utils.toArray<HTMLElement>(".cs-card-wrap", track)
    if (!wraps.length) return

    // ── Set initial state before matchMedia fires ──────────────────────────
    wraps.forEach((wrap, i) => {
      const card = wrap.querySelector<HTMLElement>(".case-study-card")
      if (card) gsap.set(card, { scale: i === 0 ? 1 : 0.94, opacity: i === 0 ? 1 : 0.5 })
    })

    const mm = gsap.matchMedia()

    // ══════════════════════════════════════════════════════
    //  DESKTOP ≥ 768 px  →  pinned GSAP horizontal scroll
    // ══════════════════════════════════════════════════════
    mm.add("(min-width: 768px)", () => {
      // Read actual card width from the DOM so calculation is always correct
      const cardW  = wraps[0].offsetWidth
      const vw     = window.innerWidth
      const startX = (vw - cardW) / 2

      // Centre first card on entry
      gsap.set(track, { x: startX })

      let lastIdx = 0

      const tween = gsap.fromTo(track,
        {
          x: () => (window.innerWidth - wraps[0].offsetWidth) / 2
        },
        {
          x: () => {
            const cw = wraps[0].offsetWidth
            const tx = (wraps.length - 1) * (cw + GAP_PX)
            return (window.innerWidth - cw) / 2 - tx
          },
          ease: "none",
          scrollTrigger: {
            trigger: section,
            pin: true,
            scrub: 1,
            start: "center center", // Pin when section is perfectly centered
            end: () => {
              const cw = wraps[0].offsetWidth
              const tx = (wraps.length - 1) * (cw + GAP_PX)
              return `+=${tx}`
            },
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const idx = Math.min(
                wraps.length - 1,
                Math.max(0, Math.round(self.progress * (wraps.length - 1)))
              )

              if (idx !== lastIdx) {
                lastIdx = idx
                wraps.forEach((wrap, i) => {
                  const card = wrap.querySelector<HTMLElement>(".case-study-card")
                  if (card) animateCard(card, i === idx)
                })
              }
            },
          },
        }
      )

      // Activate first card immediately
      const firstCard = wraps[0]?.querySelector<HTMLElement>(".case-study-card")
      if (firstCard) animateCard(firstCard, true)

      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
        gsap.set(track, { clearProps: "x" })
      }
    })

    // ══════════════════════════════════════════════════════
    //  MOBILE < 768 px  →  pinned GSAP horizontal scroll
    // ══════════════════════════════════════════════════════
    mm.add("(max-width: 767px)", () => {
      gsap.set(track, { x: (window.innerWidth - wraps[0].offsetWidth) / 2 })

      let lastIdx = 0

      const tween = gsap.fromTo(
        track,
        {
          x: () => (window.innerWidth - wraps[0].offsetWidth) / 2
        },
        {
          x: () => {
            const cw = wraps[0].offsetWidth
            const tx = (wraps.length - 1) * (cw + GAP_PX)
            return (window.innerWidth - cw) / 2 - tx
          },
          ease: "none",
          scrollTrigger: {
            trigger: section,
            pin: true,
            scrub: 1,
            start: "center center",
            end: () => {
              const cw = wraps[0].offsetWidth
              const tx = (wraps.length - 1) * (cw + GAP_PX)
              return `+=${tx}`
            },
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const idx = Math.min(
                wraps.length - 1,
                Math.max(0, Math.round(self.progress * (wraps.length - 1)))
              )

              if (idx !== lastIdx) {
                lastIdx = idx
                wraps.forEach((wrap, i) => {
                  const card = wrap.querySelector<HTMLElement>(".case-study-card")
                  if (card) animateCard(card, i === idx)
                })
              }
            },
          },
        }
      )

      const firstCard = wraps[0]?.querySelector<HTMLElement>(".case-study-card")
      if (firstCard) animateCard(firstCard, true)

      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
        gsap.set(track, { clearProps: "x" })
      }
    })

    return () => mm.revert()
  }, { scope: sectionRef })

  return (
    <section
      id="case-studies"
      ref={sectionRef}
      className="relative z-0 bg-[#F8FAFC] border-t border-slate-200"
    >
      {/* Header */}
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-20 lg:px-10">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a5f96]">
          Case Studies
        </p>
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl" style={{ letterSpacing: "-0.03em" }}>
          Results that speak for themselves.
        </h2>
        <p className="mt-4 max-w-xl text-base text-slate-500 sm:text-lg">
          Discover how organisations used MindSurve to uncover hidden decision drivers and improve business outcomes.
        </p>
      </div>

      {/* Track container — clips the overflow on desktop so cards don't spill */}
      <div className="w-full overflow-hidden">
        <div
          ref={trackRef}
          className="flex items-stretch overflow-visible pb-8 md:pb-16"
          style={{
            gap: `${GAP_PX}px`,
            paddingLeft:  "1.5rem",
            paddingRight: "1.5rem",
            scrollbarWidth: "none",
          }}
        >
          {CASE_STUDIES.map((study, i) => (
            <div
              key={i}
              /* Width purely via Tailwind — no JS at render time */
              className="cs-card-wrap w-[82vw] shrink-0 md:w-[60vw] lg:w-[55vw] xl:w-[50vw]"
            >
              {/* Explicit height keeps the track height stable while GSAP scrubs */}
              <div className="h-[380px] md:h-[400px] lg:h-[420px]">
                <CaseStudyCard {...study} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
