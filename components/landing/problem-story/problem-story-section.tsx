"use client"

import { useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { ProductMoment } from "./product-moment"
import { MeaningTransition } from "./meaning-transition"
import { PerceptionTransition } from "./perception-transition"
import { DecisionReveal } from "./decision-reveal"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

export function ProblemStorySection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return

      const opening = section.querySelector<HTMLElement>("[data-problem-opening]")
      const productStage = section.querySelector<HTMLElement>("[data-problem-product-stage]")
      const product = section.querySelector<HTMLElement>("[data-problem-product]")
      const focusRings = gsap.utils.toArray<HTMLElement>("[data-problem-focus]", section)
      const productGuides = gsap.utils.toArray<HTMLElement>(
        "[data-problem-product-guide]",
        section
      )
      const objectNote = section.querySelector<HTMLElement>("[data-problem-object-note]")
      const manyTitle = section.querySelector<HTMLElement>("[data-problem-many-title]")
      const meanings = gsap.utils.toArray<HTMLElement>("[data-problem-meaning]", section)
      const benefits = gsap.utils.toArray<HTMLElement>("[data-problem-benefit]", section)
      const motivations = gsap.utils.toArray<HTMLElement>("[data-problem-motivation]", section)
      const rules = gsap.utils.toArray<HTMLElement>("[data-problem-rule]", section)
      const isMobile = window.matchMedia("(max-width: 767px)").matches
      const meaningLineWrap = section.querySelector<SVGElement>(
        `[data-problem-meaning-lines="${isMobile ? "mobile" : "desktop"}"]`
      )
      const meaningPaths = gsap.utils.toArray<SVGPathElement>(
        "[data-problem-meaning-path]",
        meaningLineWrap ?? undefined
      )
      const perception = section.querySelector<HTMLElement>("[data-problem-perception]")
      const perceptionNodes = gsap.utils.toArray<HTMLElement>(
        "[data-problem-perception-node]",
        section
      )
      const perceptionSignals = gsap.utils.toArray<HTMLElement>(
        "[data-problem-perception-signal]",
        section
      )
      const perceptionMeanings = gsap.utils.toArray<HTMLElement>(
        "[data-problem-perception-meaning]",
        section
      )
      const perceptionDecisions = gsap.utils.toArray<HTMLElement>(
        "[data-problem-perception-decision]",
        section
      )
      const perceptionLineWrap = section.querySelector<SVGElement>(
        `[data-problem-perception-lines="${isMobile ? "mobile" : "desktop"}"]`
      )
      const perceptionPaths = gsap.utils.toArray<SVGPathElement>(
        "[data-problem-perception-path]",
        perceptionLineWrap ?? undefined
      )
      const decisionPaths = gsap.utils.toArray<SVGPathElement>(
        "[data-problem-decision-path]",
        perceptionLineWrap ?? undefined
      )
      const decisionCaption = section.querySelector<HTMLElement>(
        "[data-problem-decision-caption]"
      )
      const final = section.querySelector<HTMLElement>("[data-problem-final]")
      const finalSupport = section.querySelector<HTMLElement>("[data-problem-final-support]")
      const finalScroll = section.querySelector<HTMLElement>("[data-problem-final-scroll]")
      const backdrop = section.querySelector<HTMLElement>("[data-problem-backdrop]")
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

      const preparePath = (path: SVGPathElement) => {
        const length = path.getTotalLength()
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
          opacity: 0,
        })
      }

      meaningPaths.forEach(preparePath)
      perceptionPaths.forEach(preparePath)
      decisionPaths.forEach(preparePath)

      gsap.set(opening, { autoAlpha: 1, y: 0 })
      gsap.set(productStage, {
        autoAlpha: 1,
        xPercent: -50,
        yPercent: -50,
        top: isMobile ? "46%" : "55%",
        scale: 1,
      })
      gsap.set(product, { autoAlpha: 1, scale: 1 })
      gsap.set(focusRings, { autoAlpha: 0.65, scale: 0.94 })
      gsap.set(productGuides, { autoAlpha: 1 })
      gsap.set(objectNote, { autoAlpha: 0, y: 6 })
      gsap.set([manyTitle, perception, final], { autoAlpha: 0 })
      gsap.set(meanings, { autoAlpha: 0, scale: 0.96 })
      gsap.set(benefits, { autoAlpha: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" })
      gsap.set(motivations, {
        autoAlpha: 0,
        y: 15,
        clipPath: "inset(100% 0% 0% 0%)",
      })
      gsap.set(rules, { scaleX: 0 })
      gsap.set(perceptionNodes, { autoAlpha: 0, scale: 0.96 })
      gsap.set(perceptionDecisions, { autoAlpha: 0, y: 12 })
      gsap.set(decisionCaption, { autoAlpha: 0, y: 8 })
      gsap.set([finalSupport, finalScroll], { autoAlpha: 0, y: 8 })
      gsap.set(backdrop, { backgroundColor: "#ffffff" })

      if (reduced) {
        gsap.set(opening, { autoAlpha: 0 })
        gsap.set(productStage, {
          autoAlpha: 1,
          top: isMobile ? "31%" : "32%",
          scale: isMobile ? 0.68 : 0.72,
        })
        gsap.set(final, { autoAlpha: 1 })
        gsap.set([finalSupport, finalScroll], { autoAlpha: 1, y: 0 })
        return
      }

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      })

      // One product: the visual anchor settles while the page begins moving.
      tl.to(focusRings, {
        scale: 1,
        borderColor: "rgba(26,95,150,0.18)",
        duration: 0.8,
      })
        .to(product, { scale: 1.035, duration: 0.8 }, "<")
        .to(opening, { autoAlpha: 0, y: -18, duration: 0.55 })
        .to(objectNote, { autoAlpha: 1, y: 0, duration: 0.4 }, "<0.15")
        .to(manyTitle, { autoAlpha: 1, duration: 0.55 }, "<")

      // Meanings grow directly from the unchanged object.
      meaningPaths.forEach((path, index) => {
        tl.to(
          path,
          {
            strokeDashoffset: 0,
            opacity: 0.72,
            duration: 0.55,
            ease: "power1.inOut",
          },
          `>-${index === 0 ? 0.05 : 0.38}`
        )
        tl.to(
          meanings.filter((meaning) => meaning.dataset.meaning === path.dataset.problemMeaningPath),
          { autoAlpha: 1, scale: 1, duration: 0.38 },
          "<0.16"
        )
      })
      tl.to(rules, { scaleX: 1, duration: 0.35, stagger: 0.06 }, "<0.1")

      // Hold the full field, then reframe the same object through selected meanings.
      const isolateOrder = ["revives", "protects", "hydrates"]
      isolateOrder.forEach((id) => {
        const activeMeanings = meanings.filter((meaning) => meaning.dataset.meaning === id)
        const inactiveMeanings = meanings.filter((meaning) => meaning.dataset.meaning !== id)
        const activePaths = meaningPaths.filter((path) => path.dataset.problemMeaningPath === id)
        const inactivePaths = meaningPaths.filter((path) => path.dataset.problemMeaningPath !== id)

        tl.to(inactiveMeanings, { autoAlpha: 0.2, scale: 0.98, duration: 0.28 })
          .to(activeMeanings, { autoAlpha: 1, scale: 1.08, duration: 0.35 }, "<")
          .to(inactivePaths, { opacity: 0.12, duration: 0.28 }, "<")
          .to(activePaths, {
            opacity: 1,
            stroke: "#1a5f96",
            strokeWidth: 1.4,
            duration: 0.35,
          }, "<")
          .to(activeMeanings, { scale: 1, duration: 0.25 })
      })
      tl.to(meanings, { autoAlpha: 1, scale: 1, duration: 0.35 })
        .to(meaningPaths, {
          opacity: 0.48,
          stroke: "#cbd5e1",
          strokeWidth: 1,
          duration: 0.35,
        }, "<")

      // Functional language is physically replaced by the human interpretation.
      benefits.forEach((benefit, index) => {
        tl.to(
          benefit,
          {
            y: -16,
            autoAlpha: 0,
            clipPath: "inset(0% 0% 100% 0%)",
            duration: 0.34,
          }
        ).to(
          motivations[index],
          {
            y: 0,
            autoAlpha: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.42,
          },
          "<0.08"
        )
      })
      tl.to(objectNote, { color: "#1a5f96", duration: 0.35 })

      // Four meanings resolve into three coherent perception paths.
      tl.to([manyTitle, meanings], { autoAlpha: 0, scale: 0.96, duration: 0.5 })
        .to(productGuides, { autoAlpha: 0, duration: 0.35 }, "<")
        .to(
          objectNote,
          { autoAlpha: isMobile ? 0 : 1, duration: 0.35 },
          "<"
        )
        .to(meaningPaths, {
          strokeDashoffset: (_index, path: SVGPathElement) => path.getTotalLength(),
          opacity: 0,
          duration: 0.55,
          ease: "power1.inOut",
        }, "<")
        .to(backdrop, { backgroundColor: "#f8fafc", duration: 0.65 }, "<")
        .to(perception, { autoAlpha: 1, duration: 0.5 }, "<0.12")

      perceptionPaths.forEach((path, index) => {
        tl.to(
          path,
          { strokeDashoffset: 0, opacity: 0.72, duration: 0.6, ease: "power1.inOut" },
          index === 0 ? ">" : "<0.1"
        )
      })
      tl.to(perceptionNodes, {
        autoAlpha: 1,
        scale: 1,
        duration: 0.45,
        stagger: 0.12,
      }, "<0.18")

      // The paths continue beyond perception and become three different actions.
      decisionPaths.forEach((path, index) => {
        tl.to(
          path,
          { strokeDashoffset: 0, opacity: 0.7, duration: 0.55, ease: "power1.inOut" },
          index === 0 ? ">" : "<0.08"
        )
      })
      tl.to(perceptionSignals, { y: -8, autoAlpha: 0.25, duration: 0.4 })
        .to(perceptionMeanings, { y: -6, autoAlpha: 0, duration: 0.35 }, "<")
        .to(perceptionDecisions, {
          y: 0,
          autoAlpha: 1,
          duration: 0.48,
          stagger: 0.12,
        }, "<0.1")
        .to(decisionCaption, { y: 0, autoAlpha: 1, duration: 0.45 })

      // Complexity retracts back to the one unchanged object and one business choice.
      tl.to([perceptionNodes, decisionCaption], {
        autoAlpha: 0,
        scale: 0.96,
        duration: 0.5,
      })
        .to([...perceptionPaths, ...decisionPaths], {
          strokeDashoffset: (_index, path: SVGPathElement) => path.getTotalLength(),
          opacity: 0,
          duration: 0.6,
          ease: "power1.inOut",
        }, "<")
        .to(perception, { autoAlpha: 0, duration: 0.45 }, "<0.1")
        .to(objectNote, { autoAlpha: 0, duration: 0.35 }, "<")
        .to(productStage, {
          top: isMobile ? "31%" : "32%",
          scale: isMobile ? 0.68 : 0.72,
          duration: 0.75,
        }, "<")
        .to(backdrop, { backgroundColor: "#ffffff", duration: 0.65 }, "<")
        .to(final, { autoAlpha: 1, duration: 0.6 }, "<0.22")
        .to(finalSupport, { autoAlpha: 1, y: 0, duration: 0.4 })
        .to(finalScroll, { autoAlpha: 1, y: 0, duration: 0.4 })
        .to(final, { autoAlpha: 1, duration: 0.7 })

      return () => {
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    },
    { scope: sectionRef }
  )

  return (
    <section
      ref={sectionRef}
      id="explore"
      aria-label="Why customers choose differently"
      className="relative z-20 h-[320svh] w-full scroll-mt-16 bg-white md:h-[260svh]"
    >
      <div
        data-problem-backdrop
        className="sticky top-0 h-[100svh] w-full overflow-hidden bg-white"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-slate-100"
          aria-hidden
        />
        <div className="relative mx-auto h-full w-full max-w-[90rem]">
          <ProductMoment />
          <MeaningTransition />
          <PerceptionTransition />
          <DecisionReveal />
        </div>
      </div>
    </section>
  )
}

