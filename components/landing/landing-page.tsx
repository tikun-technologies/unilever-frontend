"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useState } from "react"
import { ArrowRight, Menu, X } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { CaseStudies } from "./case-studies"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

const LOGIN_HREF = "/login"
const BRAND_BLUE = "#1a5f96"
const BRAND_BLUE_HOVER = "#155a8a"
const BRAND_BLUE_RGB = "26, 89, 150"

const shardData = [
  { label: "Pricing", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80" },
  { label: "Trust", img: "https://images.unsplash.com/photo-1618044733300-9472054094ee?auto=format&fit=crop&w=400&q=80" },
  { label: "Quality", img: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=400&q=80" },
  { label: "Speed", img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=400&q=80" },
  { label: "Design", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=80" }
]

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
  const tagsRef = useRef<HTMLDivElement[]>([])
  const scannerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!wrapperRef.current) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapperRef.current,
        start: "top top",
        end: "+=400%",
        scrub: 1,
        pin: true,
      },
    })

    // Initial setup for shards (Stacked crystal)
    gsap.set(shardsRef.current, {
      xPercent: -50,
      yPercent: -50,
      rotationX: 60,
      rotationZ: -45,
      z: (i) => i * 20 - 40,
      opacity: 0.8,
    })

    gsap.set(tagsRef.current, { opacity: 0, y: 10 })
    gsap.set(scannerRef.current, { opacity: 0, scaleY: 0 })

    // PHASE 1 -> PHASE 2: Shatter
    tl.to(text1Ref.current, { opacity: 0, y: -20, duration: 1 })
      .to(text2Ref.current, { opacity: 1, y: 0, duration: 1 }, "<")
      .to(
        shardsRef.current,
        {
          x: "random(-200, 200)",
          y: "random(-200, 200)",
          z: "random(-100, 100)",
          rotationX: "random(-180, 180)",
          rotationY: "random(-180, 180)",
          rotationZ: "random(-180, 180)",
          opacity: 0.6,
          duration: 2,
          ease: "power2.inOut",
        },
        "<"
      )

    // PHASE 2 -> PHASE 3: Organize & Scan
    tl.to(text2Ref.current, { opacity: 0, y: -20, duration: 1 }, "+=0.5")
      .to(text3Ref.current, { opacity: 1, y: 0, duration: 1 }, "<")
      .to(
        shardsRef.current,
        {
          x: (i) => {
            const spacing = typeof window !== "undefined" && window.innerWidth < 768 ? 80 : 160;
            return (i - 2) * spacing;
          },
          y: 0,
          z: 0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          opacity: 1,
          scale: () => (typeof window !== "undefined" && window.innerWidth < 768 ? 0.5 : 0.8),
          duration: 2,
          ease: "power3.inOut",
        },
        "<"
      )
      // Scanner effect
      .to(scannerRef.current, { opacity: 1, scaleY: 1, duration: 0.5 }, "-=1")
      .to(scannerRef.current, { x: 800, duration: 1.5, ease: "none" })
      .to(scannerRef.current, { opacity: 0, duration: 0.2 })
      // Tags pop up
      .to(tagsRef.current, { opacity: 1, y: 0, stagger: 0.2, duration: 0.5 }, "-=1")

    // PHASE 3 -> PHASE 4: Merge winning shards
    tl.to(text3Ref.current, { opacity: 0, y: -20, duration: 1 }, "+=0.5")
      .to(text4Ref.current, { opacity: 1, y: 0, duration: 1 }, "<")
      .to(tagsRef.current, { opacity: 0, y: -10, duration: 0.5 }, "<")
      .to(
        shardsRef.current,
        {
          x: 0,
          y: 0,
          z: (i) => (i === 1 || i === 3 ? i * 10 : -1000), // Only winning shards stay, others disappear
          opacity: (i) => (i === 1 || i === 3 ? 1 : 0),
          rotationX: 60,
          rotationZ: -45,
          scale: 1.2,
          duration: 2,
          ease: "power3.inOut",
        },
        "<"
      )
      // Add a glow to the final crystal
      .to(shardsRef.current[1], { boxShadow: `0 0 40px rgba(${BRAND_BLUE_RGB}, 0.5)`, duration: 1 }, "-=0.5")

  }, { scope: wrapperRef })

  useGSAP(() => {
    if (!heroRef.current) return

    // Scroll Parallax
    gsap.to(word1ScrollRef.current, { y: -250, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true } })
    gsap.to(word2ScrollRef.current, { y: -400, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true } })
    gsap.to(word3ScrollRef.current, { y: -150, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true } })
    gsap.to(word4ScrollRef.current, { y: -350, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true } })

    // Mouse Parallax
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const moveX = (clientX - centerX) / 40
      const moveY = (clientY - centerY) / 40

      gsap.to(word1MouseRef.current, { x: moveX * 1.5, y: moveY * 1.5, duration: 1, ease: "power2.out" })
      gsap.to(word2MouseRef.current, { x: moveX * -2, y: moveY * -2, duration: 1, ease: "power2.out" })
      gsap.to(word3MouseRef.current, { x: moveX * 2.5, y: moveY * 2.5, duration: 1, ease: "power2.out" })
      gsap.to(word4MouseRef.current, { x: moveX * -1.5, y: moveY * -1.5, duration: 1, ease: "power2.out" })
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
        <div className="absolute inset-0 z-0 h-full w-full pointer-events-none overflow-hidden text-slate-100 font-black uppercase leading-none select-none" style={{ fontSize: '13vw', color: '#F1F5F9' }}>
          <div ref={word1ScrollRef} className="absolute top-[5%] left-[-2%]">
            <div ref={word1MouseRef}>INSIGHT</div>
          </div>
          <div ref={word2ScrollRef} className="absolute top-[30%] right-[-5%]">
            <div ref={word2MouseRef}>PATTERN</div>
          </div>
          <div ref={word3ScrollRef} className="absolute top-[55%] left-[5%]">
            <div ref={word3MouseRef}>CHOICE</div>
          </div>
          <div ref={word4ScrollRef} className="absolute top-[80%] right-[2%]">
            <div ref={word4MouseRef}>DECISION</div>
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl bg-white/40 backdrop-blur-sm p-8 rounded-3xl">
          <h1 className="mb-6 text-5xl font-semibold tracking-tighter text-slate-900 md:text-7xl lg:text-8xl" style={{ letterSpacing: '-0.04em' }}>
            Understand Why <br /> People Choose.
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
            <a
              href="#story"
              className="inline-flex h-12 items-center justify-center rounded-full border border-gray-200 bg-white px-8 text-sm font-medium text-gray-800 transition-all hover:bg-gray-50"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Pinned Scroll Story */}
      <section id="story" ref={wrapperRef} className="relative w-full bg-white">
        <div ref={containerRef} className="flex h-screen w-full flex-col items-center justify-center overflow-hidden">

          {/* Text Container */}
          <div className="absolute top-1/4 z-20 w-full px-4 text-center">
            <h2 ref={text1Ref} className="text-3xl font-medium tracking-tight text-slate-900 md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Why did they choose Option A?
            </h2>
            <h2 ref={text2Ref} className="absolute left-0 top-0 w-full text-3xl font-medium tracking-tight text-slate-900 opacity-0 md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Every choice is driven by hidden variables.
            </h2>
            <h2 ref={text3Ref} className="absolute left-0 top-0 w-full text-3xl font-medium tracking-tight text-slate-900 opacity-0 md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              We isolate the exact elements that drive preference.
            </h2>
            <h2 ref={text4Ref} className="absolute left-0 top-0 w-full text-3xl font-medium tracking-tight text-slate-900 opacity-0 md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Build the perfect combination for every segment.
            </h2>
          </div>

          {/* 3D Abstract Object Container */}
          <div className="relative z-10 mt-32 h-64 w-full max-w-3xl perspective-[1000px]">
            {/* Scanner Line */}
            <div
              ref={scannerRef}
              className="absolute -left-32 top-0 z-30 h-full w-1"
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
                <div className="group relative flex h-56 w-48 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-white/30 shadow-lg backdrop-blur-md">
                  <Image src={shard.img} alt={shard.label} fill className="object-cover opacity-90 transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                  <span className="absolute bottom-4 left-4 font-medium text-white">{shard.label}</span>
                </div>

                {/* Data Tags */}
                <div
                  ref={(el) => {
                    if (el) tagsRef.current[i] = el
                  }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm"
                >
                  {shard.label}
                  <span
                    className={`ml-2 font-semibold ${i === 1 || i === 3 ? "" : "text-gray-400"}`}
                    style={i === 1 || i === 3 ? { color: BRAND_BLUE } : undefined}
                  >
                    {i === 1 || i === 3 ? '+24%' : '-2%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spacer to prevent abrupt transition from pinned story */}
      <div className="h-32 w-full bg-white md:h-48"></div>

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

      {/* Persistent Floating CTA */}
      <div className="fixed bottom-8 right-8 z-50">
        <Link
          href={LOGIN_HREF}
          className="flex h-12 items-center justify-center rounded-full bg-[#1a5f96] px-6 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-[#155a8a] hover:shadow-2xl"
        >
          Contact Us
        </Link>
      </div>
    </div>
  )
}
