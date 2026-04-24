"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import {
  ArrowRight,
  BookOpen,
  Heart,
  Linkedin,
  Menu,
  ShieldCheck,
  ShoppingCart,
  Target,
  TrendingDown,
  Users,
  X,
  Zap,
} from "lucide-react"

/** App theme blue (matches dashboard / participate headers) */
const LOGIN_HREF = "/login"

function Logo() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="flex shrink-0 cursor-pointer items-center gap-3 text-left"
    >
    
      <span className="text-xl font-bold tracking-tight sm:text-2xl">
        <span className="text-[rgba(38,116,186,1)]">Mind</span>
        <span className="text-gray-800">Surve</span>
      </span>
    </button>
  )
}

const team = [
  {
    name: "Howard Moskowitz",
    role: "President & Founder",
    photo: "/howard.jpg",
    href: "https://www.linkedin.com/search/results/all/?keywords=Howard%20Moskowitz",
  },
  {
    name: "Dave Stevens, MFA",
    role: "Chief Strategy Officer (CSO)",
    photo: "/dave.jpg",
    href: "https://www.linkedin.com/search/results/all/?keywords=Dave%20Stevens%20MFA",
  },
  {
    name: "J. Brown Fitterman",
    role: "Chief Technology Officer (CTO)",
    photo: "/jbrown.jpg",
    href: "https://www.linkedin.com/search/results/all/?keywords=J.%20Brown%20Fitterman",
  },
  {
    name: "Danny Moskowitz",
    role: "Chief Operating Officer (COO)",
    photo: "/danny.jpg",
    href: "https://www.linkedin.com/search/results/all/?keywords=Danny%20Moskowitz",
  },
] as const

const outcomeCards = [
  {
    icon: Target,
    title: "Hyper-Targeted Messaging",
    body: "Discover the exact combinations of words, ideas, and benefits that resonate with distinct consumer segments. Stop wasting ad spend on trial and error and start using the exact content that converts.",
  },
  {
    icon: Users,
    title: "Horizontal Segmentation",
    body: 'Divide your market into like-minded audiences not demographic groups... shared "mindsets." Speak directly to how different groups feel and respond to specific content, creating.',
  },
  {
    icon: ShieldCheck,
    title: "De-Risked Product Development",
    body: "Test thousands of combinations before you launch. Know what the market wants before a campaign starts.",
  },
  {
    icon: Zap,
    title: "Rapid Speed to Market",
    body: "Our iterative, rapid-testing methodology means you move from hypothesis to actionable strategy in a fraction of the time of traditional market research. Outpace competitors by acting on superior data, faster.",
  },
] as const

const impactRows = [
  {
    icon: ShoppingCart,
    label: "Optimizing Messaging for Consumer Packaged Goods",
    title: "Example: Skin Cosmetics",
    detail:
      "We rapidly tested thousands of combinations for a new skin cosmetic product, identifying the exact consumer mindset triggers that drive purchase intent before a physical prototype was ever finalized.",
  },
  {
    icon: BookOpen,
    label: "Mapping User Requirements for EdTech Platforms",
    title: 'Example: "Learning to Remember" App',
    detail:
      "Instead of asking users what they wanted, we uncovered the specific features and techniques that drive engagement for an educational app, seamlessly mapping the true cognitive requirements of the end-user.",
  },
  {
    icon: Heart,
    label: "Driving Patient Compliance and Engagement in Healthcare",
    title: "Example: Primary Care Communications",
    detail:
      "By modeling patient mindsets for general practitioner visits, we discovered how specific relational cues, tone, and structured messaging dramatically shift patient trust, satisfaction, and adherence to care plans.",
  },
] as const

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-inter),ui-sans-serif,system-ui,sans-serif] text-gray-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Navigation — fixed h-20, max-w-7xl (reference HTML) */}
      <nav className="fixed z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <Logo />
            <div className="hidden items-center space-x-8 md:flex">
              <a
                href="#challenge"
                className="font-medium text-gray-600 transition-colors hover:text-[rgba(38,116,186,1)]"
              >
                The Challenge
              </a>
              <a href="#outcomes" className="font-medium text-gray-600 transition-colors hover:text-[rgba(38,116,186,1)]">
                Outcomes
              </a>
              <a href="#impact" className="font-medium text-gray-600 transition-colors hover:text-[rgba(38,116,186,1)]">
                Impact
              </a>
              <a href="#team" className="font-medium text-gray-600 transition-colors hover:text-[rgba(38,116,186,1)]">
                Team
              </a>
              <Link
                href={LOGIN_HREF}
                className="rounded-full bg-[rgba(38,116,186,1)] px-5 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1a5f96] hover:shadow-lg"
              >
                Login / Create an account
              </Link>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Link
                href={LOGIN_HREF}
                className="rounded-full bg-[rgba(38,116,186,1)] px-3 py-2 text-xs font-semibold text-white"
              >
                Login
              </Link>
              <button
                type="button"
                className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
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
                ["#challenge", "The Challenge"],
                ["#outcomes", "Outcomes"],
                ["#impact", "Impact"],
                ["#team", "Team"],
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
                className="mt-2 rounded-full bg-[rgba(38,116,186,1)] py-3 text-center text-sm font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                Login / Create an account
              </Link>
            </nav>
          </div>
        )}
      </nav>

      {/* Hero — pt-32 / lg:pt-48, text-5xl md:text-7xl font-extrabold */}
      <section id="hero" className="relative overflow-hidden pb-20 pt-32 lg:pb-32 lg:pt-48">
        <div className="animate-landing-fade-in relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mb-8 text-5xl font-extrabold leading-tight tracking-tight text-[#1A1A1A] md:text-7xl">
            Stop Guessing. <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-[rgba(38,116,186,1)] to-sky-400 bg-clip-text text-transparent">
              Know Exactly What Drives
            </span>
            <br />
            Your Customers&apos; Decisions.
          </h1>
          <p className="mx-auto mb-10 max-w-3xl text-xl font-light leading-relaxed text-gray-600 md:text-2xl">
            Traditional surveys tell you what people <em className="italic">think</em> they want. Mind Genomics
            experiments uncover the response patterns and mindsets that actually trigger them to buy, engage, and act.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href={LOGIN_HREF}
              className="inline-flex items-center justify-center rounded-full bg-[rgba(38,116,186,1)] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[rgba(38,116,186,0.35)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#1a5f96] hover:shadow-xl"
            >
              Login / Create an account
            </Link>
          </div>
        </div>
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[800px] w-[800px] max-w-[min(100vw,800px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(38,116,186,0.08)] blur-3xl"
          aria-hidden
        />
      </section>

      {/* The Challenge */}
      <section id="challenge" className="scroll-mt-24 bg-[#1A1A1A] py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold md:text-5xl">The Problem with Asking &quot;Why?&quot;</h2>
              <div className="mb-8 h-1 w-20 bg-[rgba(38,116,186,1)]" />
              <p className="mb-6 text-lg leading-relaxed text-gray-300">
                Focus groups and traditional surveys are fundamentally flawed. When asked direct questions, consumers
                provide answers they believe are socially acceptable or logical. They over-intellectualize.
              </p>
              <p className="text-lg leading-relaxed text-gray-300">
                This &quot;intellectualization bias&quot; leaves you with generic, sanitized data that doesn&apos;t
                translate into real-world sales or engagement. To drive action, you need to bypass cognitive filters
                and map the subconscious mind.
              </p>
            </div>
            <div className="relative">
              <div
                className="absolute inset-0 rotate-3 rounded-2xl bg-gradient-to-tr from-[rgba(38,116,186,1)] to-sky-400 opacity-20"
                aria-hidden
              />
              <div className="relative rounded-2xl border border-gray-700 bg-gray-800 p-8 shadow-2xl">
                <TrendingDown className="mb-6 h-12 w-12 text-red-400" strokeWidth={2} aria-hidden />
                <h3 className="mb-4 text-2xl font-semibold text-white">The Cost of Asking Why</h3>
                <ul className="space-y-4 text-gray-400">
                  {[
                    "Wasted ad spend on the wrong hooks",
                    "Products built for demographics, not desires",
                    "Months lost in iterative guessing games",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-3">
                      <span className="mt-1 text-red-400" aria-hidden>
                        ✕
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes — hover lift + reveal body (reference) */}
      <section id="outcomes" className="scroll-mt-24 bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-6 text-3xl font-bold text-[#1A1A1A] md:text-5xl">
              Transform Data into Actionable Innovation
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600">
              This is what happens when you apply the cartography of cognition to your business.
            </p>
          </div>
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
            {outcomeCards.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[rgba(38,116,186,0.12)] transition-colors duration-300 group-hover:bg-[rgba(38,116,186,1)]">
                  <Icon className="h-7 w-7 text-[rgba(38,116,186,1)] transition-colors duration-300 group-hover:text-white" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-bold text-[#1A1A1A] transition-colors duration-300 group-hover:text-[rgba(38,116,186,1)]">
                  {title}
                </h3>
                <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-500 ease-in-out group-hover:max-h-96 group-hover:opacity-100">
                  <p className="mt-4 leading-relaxed text-gray-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section id="impact" className="scroll-mt-24 border-t border-gray-100 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-16 md:flex-row">
            <div className="w-full md:w-1/2">
              <div className="overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                  alt="Data Analytics Visualization"
                  width={1000}
                  height={750}
                  className="h-auto w-full object-cover"
                />
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <h2 className="mb-6 text-3xl font-bold text-[#1A1A1A] md:text-5xl">Proven Across Industries</h2>
              <div className="mb-8 h-1 w-20 bg-[rgba(38,116,186,1)]" />
              <p className="mb-8 text-lg leading-relaxed text-gray-600">
                Mind Genomics isn&apos;t just theory; it&apos;s a versatile innovation engine. Our data-driven cartography
                of the mind delivers clear direction regardless of your sector.
              </p>
              <ul className="space-y-4">
                {impactRows.map(({ icon: Icon, label, title: exTitle, detail }) => (
                  <li
                    key={label}
                    className="group relative flex cursor-pointer items-center gap-4 rounded-lg bg-gray-50 p-4 font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <div className="rounded-full bg-white p-2 shadow-sm">
                      <Icon className="h-5 w-5 text-[rgba(38,116,186,1)]" strokeWidth={2} />
                    </div>
                    <span>{label}</span>
                    <div className="pointer-events-none invisible absolute bottom-full left-0 z-50 mb-3 w-72 translate-y-2 rounded-xl border border-gray-100 bg-white p-5 text-sm font-normal text-gray-600 opacity-0 shadow-2xl transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 md:left-1/2 md:w-80 md:-translate-x-1/2">
                      <strong className="mb-1 block text-base text-[#1A1A1A]">{exTitle}</strong>
                      {detail}
                      <div className="absolute left-8 top-full -mt-px border-8 border-transparent border-t-white md:left-1/2 md:-translate-x-1/2" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="scroll-mt-24 bg-[#1A1A1A] py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-6 text-3xl font-bold md:text-5xl">The Mind Genomics team</h2>
            <div className="mx-auto mb-6 h-1 w-20 bg-[rgba(38,116,186,1)]" />
            <p className="text-xl text-gray-400">Pioneers in experimental psychology and data-driven strategy.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m) => (
              <a
                key={m.name}
                href={m.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-gray-700 bg-gray-800 p-6 text-center transition-all duration-300 hover:border-[rgba(38,116,186,1)] hover:bg-gray-700"
              >
                <div className="relative mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-gray-700 bg-gray-700 transition-colors group-hover:border-[rgba(38,116,186,1)]">
                  <Image
                    src={m.photo}
                    alt={m.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
                <h3 className="mb-1 text-xl font-bold text-white">{m.name}</h3>
                <p className="mb-4 text-sm font-medium text-blue-300">{m.role}</p>
                <div className="inline-flex items-center text-sm text-gray-400 transition-colors group-hover:text-white">
                  View on LinkedIn
                  <Linkedin className="ml-1 h-4 w-4" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="relative overflow-hidden bg-[#1a5f96] py-24">
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
          <h2 className="mb-6 text-4xl font-extrabold text-white md:text-6xl">Ready to map your market&apos;s mind?</h2>
          <p className="mb-6 text-lg leading-relaxed text-white">
            Stop relying on guesswork and surface-level data. Let&apos;s design an experiment that gives you the
            precise answers you need to scale confidently.
          </p>
          <Link
            href={LOGIN_HREF}
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-xl font-bold text-[rgba(38,116,186,1)] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-gray-50 hover:shadow-2xl"
          >
            Login / Create an account
            <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-800 bg-[#1A1A1A] py-8 text-center">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} MindSurve. All Rights Reserved.
        </p>
      </footer>
    </div>
  )
}
