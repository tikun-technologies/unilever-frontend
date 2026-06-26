"use client"

import { useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { CaseStudyCard } from "./case-study-card"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

const caseStudiesData = [
  {
    category: "Healthcare",
    title: "Improving Patient Engagement",
    description: "MindSurve identified the hidden factors increasing patient participation and adherence to treatment plans.",
    result: "+22% Engagement",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80"
  },
  {
    category: "Retail",
    title: "Optimizing Store Layouts",
    description: "Discovered the subconscious navigation patterns of high-value shoppers to maximize product discovery.",
    result: "+15% Conversion",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80"
  },
  {
    category: "Consumer Goods",
    title: "Predicting Flavor Trends",
    description: "Mapped sensory preferences to predict the next breakout beverage flavor before physical prototyping.",
    result: "$1.2M Revenue",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=1200&q=80"
  },
  {
    category: "Education",
    title: "Personalizing Learning Paths",
    description: "Identified cognitive friction points in digital learning environments to tailor content delivery.",
    result: "40% Higher Completion",
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    category: "Financial Services",
    title: "Building Trust in Wealth Tech",
    description: "Uncovered the specific messaging cues that signal security and competence to new retail investors.",
    result: "3x Account Opens",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1200&q=80"
  }
]

export function CaseStudies() {
  const sectionRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!sectionRef.current || !containerRef.current) return

    const mm = gsap.matchMedia()

    mm.add("(min-width: 768px)", () => {
      const container = containerRef.current!
      const cards = gsap.utils.toArray('.case-study-card') as HTMLElement[]
      
      // Calculate the total distance to scroll horizontally
      // We want to scroll until the right edge of the last card aligns with the right edge of the viewport
      const totalScroll = container.scrollWidth - window.innerWidth + (window.innerWidth * 0.2) // Add padding at the end

      const scrollTween = gsap.to(container, {
        x: -totalScroll,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          pin: true,
          scrub: 1, // Smooth scrubbing
          start: "center center", // Pin when section is centered
          end: () => `+=${totalScroll}`,
          invalidateOnRefresh: true,
        }
      })

      // Animate individual cards
      cards.forEach((card) => {
        gsap.fromTo(card,
          { opacity: 0.3, scale: 0.9, y: 20 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              containerAnimation: scrollTween,
              start: "left center+=40%",
              end: "center center",
              scrub: true,
            }
          }
        )

        gsap.to(card, {
          opacity: 0.3,
          scale: 0.9,
          y: 20,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            containerAnimation: scrollTween,
            start: "center center",
            end: "right center-=40%",
            scrub: true,
          }
        })
      })
    })

    return () => mm.revert()
  }, { scope: sectionRef })

  return (
    <section 
      id="case-studies" 
      ref={sectionRef} 
      className="relative overflow-hidden bg-[#F8FAFC] py-24 md:py-32 rounded-t-[3rem] border-t border-slate-200 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)]"
    >
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 md:px-[10vw] mb-12">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl" style={{ letterSpacing: '-0.03em' }}>
            Case Studies
          </h2>
          <p className="mt-4 text-base text-slate-500 md:text-lg">
            Discover how organizations used MindSurve to uncover hidden decision drivers.
          </p>
        </div>
      </div>

      <div className="w-full">
        <div 
          ref={containerRef}
          className="flex gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory px-4 pb-12 pt-4 md:overflow-visible md:snap-none md:px-[10vw]"
          style={{ scrollbarWidth: 'none' }}
        >
          {caseStudiesData.map((study, index) => (
            <CaseStudyCard key={index} {...study} />
          ))}
        </div>
      </div>
    </section>
  )
}
