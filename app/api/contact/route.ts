import { NextRequest, NextResponse } from "next/server"
import { getBrand } from "@/lib/config/brand"

const TEAM_EMAIL = process.env.CONTACT_TEAM_EMAIL || "jbrown@tikuntech.com"
const RESEND_API_KEY = process.env.RESEND_API_KEY

const MAX_NAME = 120
const MAX_COMPANY = 120
const MAX_MESSAGE = 4000
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 5

const recentByIp = new Map<string, number[]>()

type ContactBody = {
  name?: unknown
  company?: unknown
  email?: unknown
  message?: unknown
  website?: unknown
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const stamps = (recentByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (stamps.length >= RATE_LIMIT) {
    recentByIp.set(ip, stamps)
    return true
  }
  stamps.push(now)
  recentByIp.set(ip, stamps)
  return false
}

function buildEmailText(input: {
  name: string
  company: string
  email: string
  message: string
}): string {
  return [
    "New study inquiry from the landing page.",
    "",
    `Name: ${input.name}`,
    `Company: ${input.company || "—"}`,
    `Email: ${input.email}`,
    "",
    "Message:",
    input.message,
  ].join("\n")
}

async function sendWithResend(input: {
  name: string
  company: string
  email: string
  message: string
  subject: string
}): Promise<boolean> {
  if (!RESEND_API_KEY) return false

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${getBrand().displayName} <onboarding@resend.dev>`,
      to: [TEAM_EMAIL],
      reply_to: input.email,
      subject: input.subject,
      text: buildEmailText(input),
    }),
  })

  return res.ok
}

async function sendWithFormSubmit(input: {
  name: string
  company: string
  email: string
  message: string
  subject: string
}): Promise<boolean> {
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(TEAM_EMAIL)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      company: input.company,
      email: input.email,
      message: input.message,
      _subject: input.subject,
      _template: "table",
      _replyto: input.email,
    }),
  })

  if (!res.ok) return false
  const data = (await res.json().catch(() => null)) as { success?: string } | null
  return data?.success === "true" || res.ok
}

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: "Too many inquiries. Please try again in a few minutes." },
      { status: 429 }
    )
  }

  let body: ContactBody
  try {
    body = (await req.json()) as ContactBody
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (asTrimmedString(body.website)) {
    return NextResponse.json({ ok: true })
  }

  const name = asTrimmedString(body.name)
  const company = asTrimmedString(body.company)
  const email = asTrimmedString(body.email)
  const message = asTrimmedString(body.message)

  if (name.length < 2 || name.length > MAX_NAME) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 })
  }
  if (company.length > MAX_COMPANY) {
    return NextResponse.json({ error: "Company name is too long." }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 })
  }
  if (message.length < 10 || message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "Please enter a message (at least 10 characters)." }, { status: 400 })
  }

  const subject = `${getBrand().displayName} study inquiry from ${name}`
  const payload = { name, company, email, message, subject }

  try {
    const sent = (await sendWithResend(payload)) || (await sendWithFormSubmit(payload))
    if (!sent) {
      return NextResponse.json(
        { error: "Could not send your inquiry. Please try again." },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Could not send your inquiry. Please try again." },
      { status: 502 }
    )
  }
}
