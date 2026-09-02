"use client"

import { useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { DECODE_POSITIONS, WORKFLOW_STAGES } from "./data"
import { WorkflowIntro, StageCopy } from "./stage-copy"
import { ResearchCanvas } from "./research-canvas"
import { ReducedWorkflow } from "./reduced-workflow"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

export function FromResearchToDecision() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return

      const mm = gsap.matchMedia()

      mm.add(
        {
          mobile: "(max-width: 767px)",
          desktop: "(min-width: 768px)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { mobile = false, reduce = false } = context.conditions ?? {}
          const isMobile = Boolean(mobile)
          const prefersReducedMotion = Boolean(reduce)
          const animated = section.querySelector<HTMLElement>("[data-workflow-animated]")
          const sticky = section.querySelector<HTMLElement>("[data-workflow-sticky]")
          const reducedView = section.querySelector<HTMLElement>("[data-workflow-reduced]")

          if (prefersReducedMotion) {
            gsap.set(section, { height: "auto" })
            gsap.set(sticky, { display: "none" })
            gsap.set(animated, { display: "none" })
            gsap.set(reducedView, { display: "block" })
            return
          }

          gsap.set(reducedView, { display: "none" })
          gsap.set(animated, { display: "block" })
          gsap.set(sticky, { display: "block" })

          const intro = section.querySelector<HTMLElement>("[data-workflow-intro]")
          const copy = section.querySelector<HTMLElement>("[data-workflow-copy]")
          const canvas = section.querySelector<HTMLElement>("[data-workflow-canvas]")
          const question = section.querySelector<HTMLElement>("[data-workflow-question]")
          const lock = section.querySelector<HTMLElement>("[data-workflow-lock]")
          const pattern = section.querySelector<HTMLElement>("[data-workflow-pattern]")
          const insight = section.querySelector<HTMLElement>("[data-workflow-insight]")
          const decision = section.querySelector<HTMLElement>("[data-workflow-decision]")
          const stageCopies = new Map(
            WORKFLOW_STAGES.map((stage) => [
              stage.id,
              section.querySelector<HTMLElement>(`[data-workflow-stage-copy="${stage.id}"]`),
            ])
          )
          const progressSegments = new Map(
            WORKFLOW_STAGES.map((stage) => [
              stage.id,
              section.querySelector<HTMLElement>(
                `[data-workflow-progress-segment="${stage.id}"]`
              ),
            ])
          )
          const lineWrap = section.querySelector<SVGElement>(
            `[data-workflow-lines="${isMobile ? "mobile" : "desktop"}"]`
          )
          const stimulusPaths = isMobile
            ? []
            : gsap.utils.toArray<SVGPathElement>(
                "[data-workflow-stimulus-path]",
                lineWrap ?? undefined
              )
          const decodePaths = isMobile
            ? []
            : gsap.utils.toArray<SVGPathElement>(
                "[data-workflow-decode-path]",
                lineWrap ?? undefined
              )
          const activeLayouts = Array.from(
            section.querySelectorAll<HTMLElement>(
              `[data-workflow-layout="${isMobile ? "mobile" : "desktop"}"]`
            )
          )
          const propositions = activeLayouts.flatMap((layout) =>
            Array.from(layout.querySelectorAll<HTMLElement>("[data-workflow-proposition]"))
          )
          const responses = activeLayouts.flatMap((layout) =>
            Array.from(layout.querySelectorAll<HTMLElement>("[data-workflow-response]"))
          )
          const winner = propositions.find((item) => item.dataset.winner === "true")
          const nonWinners = propositions.filter((item) => item.dataset.winner !== "true")
          const winnerLabel = winner?.querySelector<HTMLElement>(
            "[data-workflow-proposition-label]"
          )
          const winnerScore = winner?.querySelector<HTMLElement>(
            "[data-workflow-proposition-score]"
          )

          const preparePath = (path: SVGPathElement) => {
            const length = path.getTotalLength()
            gsap.set(path, {
              strokeDasharray: length,
              strokeDashoffset: length,
              opacity: 0,
            })
          }

          stimulusPaths.forEach(preparePath)
          decodePaths.forEach(preparePath)

          gsap.set(intro, { autoAlpha: 1, y: 0 })
          gsap.set([copy, canvas], { autoAlpha: 0 })
          gsap.set(stageCopies.get("ask") ?? null, { autoAlpha: 0, y: 14 })
          gsap.set(
            [
              stageCopies.get("test"),
              stageCopies.get("decode"),
              stageCopies.get("decide"),
            ],
            { autoAlpha: 0, y: 14 }
          )
          gsap.set(question, { autoAlpha: 0, y: 18, scale: 1 })
          gsap.set(lock, { autoAlpha: 0 })
          gsap.set(propositions, { autoAlpha: 0, y: 14, scale: 0.96 })
          gsap.set(responses, { autoAlpha: 0, scale: 0.8, x: 0, y: 8 })
          gsap.set([pattern, insight, decision], { autoAlpha: 0 })
          gsap.set(Array.from(progressSegments.values()), {
            backgroundColor: "#e2e8f0",
            scaleX: 0.35,
          })

          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.85,
              invalidateOnRefresh: true,
            },
          })

          const activateStage = (
            next: (typeof WORKFLOW_STAGES)[number]["id"],
            previous?: (typeof WORKFLOW_STAGES)[number]["id"]
          ) => {
            if (previous) {
              tl.to(stageCopies.get(previous) ?? null, {
                autoAlpha: 0,
                y: -12,
                duration: 0.35,
              })
            }
            tl.to(
              stageCopies.get(next) ?? null,
              { autoAlpha: 1, y: 0, duration: 0.45 },
              previous ? "<0.12" : ">"
            )
            tl.to(
              progressSegments.get(next) ?? null,
              {
                backgroundColor: "#1a5f96",
                scaleX: 1,
                duration: 0.4,
              },
              "<"
            )
          }

          // Compact intro establishes the promise before the work begins.
          tl.to(intro, { autoAlpha: 1, duration: 0.7 })
            .to(intro, { autoAlpha: 0, y: -18, duration: 0.5 })
            .to([copy, canvas], { autoAlpha: 1, duration: 0.5 }, "<0.12")

          activateStage("ask")
          tl.to(question, { autoAlpha: 1, y: 0, duration: 0.55 })
            .to(question, { scale: 0.985, duration: 0.5 })
            .to(lock, { autoAlpha: 1, duration: 0.35 }, "<0.2")

          // The defined question becomes the source for three live propositions.
          activateStage("test", "ask")
          tl.to(question, {
            top: isMobile ? "9%" : undefined,
            y: isMobile ? -5 : -10,
            scale: isMobile ? 0.94 : 0.9,
            autoAlpha: 0.65,
            duration: 0.5,
          })

          stimulusPaths.forEach((path, index) => {
            tl.to(
              path,
              {
                strokeDashoffset: 0,
                opacity: 0.7,
                duration: 0.5,
                ease: "power1.inOut",
              },
              index === 0 ? ">" : "<0.1"
            )
          })
          tl.to(propositions, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.45,
            stagger: 0.12,
          }, "<0.12")
          tl.to(responses, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.36,
            stagger: 0.08,
          })

          // Raw signals physically converge and organize around one driver.
          activateStage("decode", "test")
          tl.to(question, { autoAlpha: 0.18, duration: 0.4 })
            .to(stimulusPaths, { opacity: 0.1, duration: 0.4 }, "<")

          decodePaths.forEach((path, index) => {
            tl.to(
              path,
              {
                strokeDashoffset: 0,
                opacity: 0.5,
                duration: 0.48,
                ease: "power1.inOut",
              },
              index === 0 ? ">" : "<0.08"
            )
          })

          tl.to(propositions, {
            autoAlpha: isMobile ? 0 : 0.2,
            scale: 0.96,
            duration: 0.4,
          }, "<")
            .to(
              responses,
              {
                x: isMobile ? 0 : (index, element) => {
                  if (!canvas) return 0
                  const target =
                    canvas.clientWidth / 2 +
                    DECODE_POSITIONS[index].x
                  return target - (element.offsetLeft + element.offsetWidth / 2)
                },
                y: isMobile ? 0 : (index, element) => {
                  if (!canvas) return 0
                  const target =
                    canvas.clientHeight * 0.58 +
                    DECODE_POSITIONS[index].y
                  return target - (element.offsetTop + element.offsetHeight / 2)
                },
                scale: isMobile ? 0.72 : 0.88,
                autoAlpha: isMobile ? 0 : 0.52,
                duration: isMobile ? 0.45 : 0.8,
                stagger: 0.04,
              },
              "<0.08"
            )
            .to(pattern, { autoAlpha: 1, scale: 1, duration: 0.55 }, "<0.3")
            .to(responses, { autoAlpha: 0.14, duration: 0.4 })
            .to(insight, { autoAlpha: 1, y: 0, duration: 0.45 }, "<0.1")

          // The discovered driver resolves the original alternatives into a choice.
          activateStage("decide", "decode")
          tl.to(decodePaths, {
            strokeDashoffset: (_index, path: SVGPathElement) => path.getTotalLength(),
            opacity: 0,
            duration: 0.5,
          })
            .to(responses, { autoAlpha: 0, scale: 0.7, duration: 0.4 }, "<")
            .to(pattern, {
              autoAlpha: isMobile ? 0 : 0.16,
              scale: 0.78,
              y: isMobile ? 12 : 22,
              duration: 0.55,
            }, "<")
            .to(
              question,
              { autoAlpha: isMobile ? 0 : 0.18, duration: 0.35 },
              "<"
            )
            .to(propositions, { autoAlpha: 0.55, scale: 1, duration: 0.5 }, "<0.08")
            .to(nonWinners, {
              autoAlpha: isMobile ? 0.08 : 0.18,
              duration: 0.4,
            })
            .to(winner ?? null, {
              autoAlpha: 1,
              scale: 1.18,
              duration: 0.5,
            }, "<")
            .to(winnerLabel ?? null, { color: "#1a5f96", duration: 0.4 }, "<")
            .to(winnerScore ?? null, { autoAlpha: 1, duration: 0.35 }, "<0.1")
            .to(decision, { autoAlpha: 1, y: 0, duration: 0.5 })
            .to(decision, { autoAlpha: 1, duration: 0.75 })

          return () => {
            tl.scrollTrigger?.kill()
            tl.kill()
          }
        }
      )

      return () => mm.revert()
    },
    { scope: sectionRef }
  )

  return (
    <section
      ref={sectionRef}
      aria-label="From research to decision"
      className="relative z-20 h-[270svh] w-full bg-white md:h-[300svh]"
    >
      <div
        data-workflow-sticky
        className="sticky top-0 h-[100svh] w-full overflow-hidden bg-white"
      >
        <div data-workflow-animated className="relative h-full w-full">
          <WorkflowIntro />
          <StageCopy />
          <ResearchCanvas />
        </div>
      </div>
      <ReducedWorkflow />
    </section>
  )
}

