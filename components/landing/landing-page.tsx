"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useState, useEffect } from "react"
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

const shardData = [
  { label: "Unclear direction", segment: "Low fit", score: "-8%", img: "/worstdesign.webp", isBest: false },
  { label: "Design route 1", segment: "Best for Gen Z", score: "+18%", img: "/desgn1.webp", isBest: false },
  { label: "Best Design", segment: "Best overall", score: "+34%", img: "/Best Design.webp", isBest: true },
  { label: "Design route 2", segment: "Best for Millennials", score: "+21%", img: "/design2.webp", isBest: false },
  { label: "Design route 3", segment: "Best for Families", score: "+16%", img: "/design3.webp", isBest: false },
]

/** 3 on top row, 2 on bottom row — keeps all 5 visible on phones */
function getMobileGridPosition(index: number, phase: "shatter" | "scan") {
  const isSmallPhone = typeof window !== "undefined" && window.innerWidth < 480
  const spread = isSmallPhone ? 0.9 : 1

  const topRow = [
    { x: -66 * spread, y: -58 * spread },
    { x: 0, y: -68 * spread },
    { x: 66 * spread, y: -58 * spread },
  ]
  const bottomRow = [
    { x: -34 * spread, y: 74 * spread },
    { x: 34 * spread, y: 74 * spread },
  ]

  const pos = [...topRow, ...bottomRow][index] ?? { x: 0, y: 0 }

  if (phase === "scan") {
    return { x: pos.x * 1.06, y: pos.y * 1.04 }
  }
  return pos
}

/** Scanner is positioned at `-left-32`; travel must cover the full mobile grid width. */
function getMobileScannerX(isStart: boolean): number {
  if (typeof window === "undefined") return isStart ? 0 : 420

  const containerW = Math.min(window.innerWidth - 32, 1024)
  const positions = [0, 1, 2, 3, 4].map((i) => getMobileGridPosition(i, "scan").x)
  const halfBottle = window.innerWidth < 480 ? 44 : 50
  const edge = isStart ? Math.min(...positions) : Math.max(...positions)
  const sign = isStart ? -1 : 1

  // -128px base offset (-left-32) + x transform = container center + shard offset ± half bottle
  return containerW / 2 + sign * halfBottle + edge + 128
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
  const shardsRef = useRef<HTMLDivElement[]>([])
  const shardVisualRefs = useRef<HTMLDivElement[]>([])
  const tagsRef = useRef<HTMLDivElement[]>([])
  const tagsDesktopRef = useRef<HTMLDivElement[]>([])
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

    const buildStoryTimeline = (isDesktop: boolean) => {
      const scaleTargets = isDesktop ? shardVisualRefs.current : shardsRef.current
      const tagTargets = isDesktop ? tagsDesktopRef.current : tagsRef.current

      const tl = gsap.timeline({ scrollTrigger: scrollConfig })

      gsap.set(shardsRef.current, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 0,
        z: 0,
        opacity: (i) => (i === 0 ? 1 : 0),
        ...(isDesktop
          ? { rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1 }
          : {
              rotationX: 0,
              rotationY: 0,
              rotationZ: 0,
              scale: (i) => (i === 0 ? 1.15 : 0.7),
            }),
      })

      if (isDesktop) {
        gsap.set(shardVisualRefs.current, {
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scale: (i) => (i === 0 ? 1 : 0.7),
        })
      }

      gsap.set(tagTargets, { opacity: 0, y: 10 })
      gsap.set(scannerRef.current, { opacity: 0, scaleY: 0 })

      tl.to(text1Ref.current, { opacity: 0, y: -20, duration: 1 })
        .to(text2Ref.current, { opacity: 1, y: 0, duration: 1 }, "<")

      if (isDesktop) {
        tl.to(scaleTargets[0], {
          scale: 0.78,
          rotationZ: -8,
          duration: 1.2,
          ease: "power2.inOut",
        }, "<")
          .to(shardsRef.current[0], { opacity: 0.35, duration: 1.2, ease: "power2.inOut" }, "<")
      } else {
        tl.to(shardsRef.current[0], {
          scale: 0.9,
          opacity: 0.35,
          rotationZ: -8,
          duration: 1.2,
          ease: "power2.inOut",
        }, "<")
      }

      tl.to(
        shardsRef.current,
        {
          x: (i) => {
            if (!isDesktop) return getMobileGridPosition(i, "shatter").x
            return (i - 2) * 135
          },
          y: (i) => {
            if (!isDesktop) return getMobileGridPosition(i, "shatter").y
            const offsets = [32, -20, 0, -18, 28]
            return offsets[i] ?? 0
          },
          z: 0,
          opacity: 0.72,
          duration: 2,
          ease: "power2.inOut",
        },
        "-=0.4"
      )
        .to(
          scaleTargets,
          {
            rotationX: 0,
            rotationY: (i) => (isDesktop ? (i - 2) * -5 : 0),
            rotationZ: (i) => {
              const rotations = [-7, 4, 0, -4, 7]
              return rotations[i] ?? 0
            },
            scale: isDesktop ? 0.64 : 0.5,
            duration: 2,
            ease: "power2.inOut",
          },
          "-=2"
        )

      tl.to(text2Ref.current, { opacity: 0, y: -20, duration: 1 }, "+=0.5")
        .to(text3Ref.current, { opacity: 1, y: 0, duration: 1 }, "<")
        .to(
          shardsRef.current,
          {
            x: (i) => {
              if (!isDesktop) return getMobileGridPosition(i, "scan").x
              return (i - 2) * 170
            },
            y: (i) => {
              if (!isDesktop) return getMobileGridPosition(i, "scan").y
              return 0
            },
            z: 0,
            opacity: 0.76,
            duration: 2,
            ease: "power3.inOut",
          },
          "<"
        )
        .to(
          scaleTargets,
          {
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scale: isDesktop ? 0.72 : 0.56,
            duration: 2,
            ease: "power3.inOut",
          },
          "<"
        )
        .to(scannerRef.current, { opacity: 1, scaleY: 1, duration: 0.5 }, "-=0.5")

      if (isDesktop) {
        tl.to(scannerRef.current, {
          x: 980,
          duration: 1.5,
          ease: "none",
        }, "scan")
      } else {
        tl.fromTo(
          scannerRef.current,
          { x: () => getMobileScannerX(true) },
          { x: () => getMobileScannerX(false), duration: 1.5, ease: "none" },
          "scan"
        )
      }

      tl.to(scannerRef.current, { opacity: 0, duration: 0.2 }, "scan+=1.5")

      tagTargets.forEach((tag, i) => {
        if (!tag) return
        tl.fromTo(
          tag,
          isDesktop ? { opacity: 0, y: 12 } : { opacity: 0, y: 14, scale: 0.92 },
          isDesktop
            ? { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" }
            : { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: "back.out(1.7)" },
          `scan+=${0.1 + i * 0.28}`
        )
      })

      tl.to(text3Ref.current, { opacity: 0, y: -20, duration: 1 }, "+=0.5")
        .to(text4Ref.current, { opacity: 1, y: 0, duration: 1 }, "<")
        .to({}, { duration: 1 })
        .to(tagTargets, { opacity: (i) => (i === 2 ? 1 : 0.18), y: (i) => (i === 2 ? 0 : 10), duration: 0.7 }, "+=0.2")
        .to(
          shardsRef.current,
          {
            x: 0,
            y: isDesktop ? 20 : 10,
            z: (i) => (i === 2 ? 160 : -200),
            opacity: (i) => (i === 2 ? 1 : 0),
            duration: 2,
            ease: "power3.inOut",
          },
          "<"
        )
        .to(
          scaleTargets,
          {
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scale: (i) => {
              if (i !== 2) return isDesktop ? 0.5 : 0.45
              return isDesktop ? 1 : 0.95
            },
            duration: 2,
            ease: "power3.inOut",
          },
          "<"
        )

      if (isDesktop) {
        tl.to(scaleTargets[2], { filter: `drop-shadow(0 24px 40px rgba(${BRAND_BLUE_RGB}, 0.22))`, duration: 1 }, "-=0.6")
          .to(shardsRef.current[2], { y: 20, duration: 1.2, ease: "none" }, "+=0.4")
          .to(scaleTargets[2], { scale: 1.1, duration: 1.2, ease: "none" }, "<")
      } else {
        tl.to(shardsRef.current[2], { filter: `drop-shadow(0 24px 40px rgba(${BRAND_BLUE_RGB}, 0.22))`, duration: 1 }, "-=0.6")
          .to(shardsRef.current[2], { scale: 1.05, y: 10, duration: 1.2, ease: "none" }, "+=0.4")
      }

      return tl
    }

    const mm = gsap.matchMedia()
    mm.add("(min-width: 768px)", () => buildStoryTimeline(true))
    mm.add("(max-width: 767px)", () => buildStoryTimeline(false))

    return () => mm.revert()
  }, { scope: wrapperRef })

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
          <div className="absolute top-1/4 z-20 w-full px-4 text-center">
            <h2 ref={text1Ref} className="text-3xl font-medium tracking-tight text-slate-900 md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Why does one design win?
            </h2>
            <h2 ref={text2Ref} className="absolute left-0 top-0 w-full text-3xl font-medium tracking-tight text-slate-900 opacity-0 md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Break the weak concept into testable alternatives.
            </h2>
            <h2 ref={text3Ref} className="absolute left-0 top-0 w-full text-3xl font-medium tracking-tight text-slate-900 opacity-0 md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Scan what people actually respond to.
            </h2>
            <h2 ref={text4Ref} className="absolute left-0 top-0 w-full text-3xl font-medium tracking-tight text-slate-900 opacity-0 md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Choose the strongest design for each segment.
            </h2>
          </div>

          {/* 3D Abstract Object Container — taller on mobile for 3+2 grid */}
          <div className="relative z-10 mt-16 h-[440px] w-full max-w-5xl perspective-[1000px] sm:mt-20 sm:h-[480px] md:mt-32 md:h-64">
            {/* Scanner Line */}
            <div
              ref={scannerRef}
              className="absolute -left-32 top-1/2 z-30 h-[72%] w-1 -translate-y-1/2 rounded-full"
              style={{
                backgroundColor: BRAND_BLUE,
                boxShadow: `0 0 20px rgba(${BRAND_BLUE_RGB}, 0.8)`,
              }}
            />

            {/* Shards */}
            {shardData.map((shard, i) => (
              <div
                key={i}
                ref={(el) => {
                  if (el) shardsRef.current[i] = el
                }}
                className="absolute left-1/2 top-1/2 preserve-3d"
              >
                <div
                  ref={(el) => {
                    if (el) shardVisualRefs.current[i] = el
                  }}
                  className="md:origin-center md:preserve-3d"
                >
                  <div className="relative flex h-48 w-36 items-center justify-center sm:h-52 sm:w-40 md:h-72 md:w-56">
                    <Image
                      src={shard.img}
                      alt={shard.label}
                      fill
                      sizes="(max-width: 768px) 48vw, 288px"
                      className="object-contain"
                      priority={i === 0 || shard.isBest}
                    />
                  </div>
                  {/* Mobile tags — unchanged styling & inside scaled parent */}
                  <div
                    ref={(el) => {
                      if (el) tagsRef.current[i] = el
                    }}
                    className={[
                      "absolute left-1/2 top-full mt-2 w-max max-w-[9rem] -translate-x-1/2 rounded-xl border border-slate-200 bg-white/90 px-2 py-1 text-center text-[10px] leading-tight shadow-lg shadow-slate-200/70 backdrop-blur-md md:hidden",
                      "sm:mt-4 sm:max-w-[13rem] sm:rounded-2xl sm:px-4 sm:py-2 sm:text-xs sm:leading-normal",
                      i === 0 && "!-translate-x-[calc(50%+20px)]",
                      i === 2 && "!-translate-x-[calc(50%-20px)]",
                      i === 3 && "!-translate-x-[calc(50%+16px)] mt-3",
                      i === 4 && "!-translate-x-[calc(50%-16px)] mt-3",
                    ].filter(Boolean).join(" ")}
                  >
                    <div className="font-semibold text-slate-900">{shard.segment}</div>
                    <div className={`mt-0.5 font-semibold ${shard.isBest ? "text-[#1a5f96]" : "text-slate-500"}`}>
                      {shard.score} preference lift
                    </div>
                  </div>
                </div>
                {/* Desktop tags — solid background, outside scaled bottle wrapper */}
                <div
                  ref={(el) => {
                    if (el) tagsDesktopRef.current[i] = el
                  }}
                  className="pointer-events-none absolute left-1/2 top-full mt-4 hidden w-max max-w-[11rem] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center text-xs leading-normal antialiased shadow-md md:block"
                >
                  <div className="font-semibold text-slate-900">{shard.segment}</div>
                  <div className={`mt-0.5 font-semibold ${shard.isBest ? "text-[#1a5f96]" : "text-slate-500"}`}>
                    {shard.score} preference lift
                  </div>
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
